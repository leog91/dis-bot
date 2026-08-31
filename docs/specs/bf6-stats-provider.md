# BF6 Stats Provider

## Purpose

The `bf6` command family scrapes per-player Battlefield 6 stats and persists snapshots
for leaderboards, history, item (gadget/vehicle) stats, weapon playstyles, and class
stats. The upstream source must be **interchangeable** so the bot can survive a provider
being blocked or shutting down without touching command, persistence, or formatting code.

## Background / motivation

- The original source, tracker.gg's unofficial profile API
  (`https://api.tracker.gg/api/v2/bf6/standard/profile/ign/{id}`), started returning
  `403` + an HTML "You've Been Blocked - Tracker Network" page. The block page explicitly
  forbids scraping and threatens legal action; bypassing it is out of scope.
- tracker.gg's *official* developer API does not cover BF6 and the operator states keys
  will not be granted for it.
- The chosen replacement is the free, community-run **gametools.network** API
  (`https://api.gametools.network/bf6/...`), which is an intended integration surface
  (no key required).

## Design

All provider access goes through a single seam:

```
utils/bf6providers/
  types.ts      -> BF6StatsProvider interface + shared result types
  tracker.ts    -> legacy tracker.gg scraper (verbatim move of old fetchPlayerData)
  gametools.ts  -> gametools.network adapter
  index.ts      -> getBF6Provider() picks provider via BF6_STATS_PROVIDER env
```

`utils/bf6rank.ts` keeps its public API (`fetchPlayerData`, `bf6Rank`, `updateBf6Data`,
extract/format helpers) and simply delegates the network call to the active provider.
Downstream consumers (`utils/bf6data.ts`, `utils/bf6commands/*`, `db` layer) are
unchanged in behavior.

### Provider interface

```ts
type BF6StatsProvider = {
  name: string; // "tracker" | "gametools"
  defaultConcurrency: number;
  requestDelayMs?: number;
  fetchPlayer(player: Player, timeoutMs?: number): Promise<PlayerFetchResult>;
};
```

`PlayerFetchResult` is the existing discriminated union (`{ ok: true; data }` |
`{ ok: false; status; apiBlocked? }`) — unchanged so the persistence layer can keep
treating both providers identically.

### Player identity

Providers key players differently. The players config (`config/bf6players.json`, path via
`BF6_PLAYERS_CONFIG_PATH`) is the canonical identity record:

```jsonc
{
  "userName": "K00ftt",
  "ids": {
    "tracker": { "profileId": "2851980846" },
    "ea": { "personaId": "1115553730", "nucleusId": "2626883460" }
  },
  "nicks": {
    "tracker": ["K00ftt"],
    "ea": ["K00ftt", "-LAG-Kooftt"]
  }
}
```

- `userName` is the stable local key used by bot commands.
- `ids.tracker.profileId` is used by the tracker provider and profile URLs.
- `ids.ea.personaId` is used by gametools; `nucleusId` records the EA account identity.
- `ids.steam` records linked Steam identity IDs when known.
- `nicks` records current and historical handles by source without using mutable handles
  as database keys.

## Field mapping (tracker -> gametools)

`PlayerFetchSuccess` shape is identical for both providers. Mapping decisions:

| Field | tracker.gg | gametools.network | Notes |
|---|---|---|---|
| kills | `segments[0].stats.playerKills` | `dividedKills.human` | **Human kills only**, excluding AI bots. Matches prior leaderboard semantics. |
| deaths / revives / score | stats | `deaths` / `revives` / `score` | |
| timePlayedValue | `timePlayed.value` | aggregate `classes[id=kit].secondsPlayed` | Top-level `secondsPlayed` overcounts versus tracker; used only as fallback. |
| timePlayedDisplay | `timePlayed.displayValue` | formatted from mapped seconds | Keeps the existing hours-based display. |
| careerPlayerRank | `careerPlayerRank.value` | **NULL** | gametools exposes XP totals, not rank. |
| profileUrl | `https://tracker.gg/bf6/profile/{id}/overview` | same (kept) | Still the canonical public profile page. |
| platformUserHandle | `platformInfo.platformUserHandle` | `userName` | |
| weapon playstyles | weapon segments | `weapons[]` | ADS kills <- `scopedKills`; hipfire <- `hipfireKills`; headshots <- `headshotKills`; accuracy <- `shotsHit`/`shotsFired`; playtime <- `timeEquipped` (>= 3600s filter kept). |
| gadget snapshots | gadget segments | `gadgets[]` + `melee[]` | matched by item `id` against `BF6_GADGETS[].exactKeys`; playtime <- `secondsPlayed` / `timeEquipped`. |
| vehicle snapshots | vehicle segments | `vehicles[]`, `vehicleGroups[]`, `vehicleArchetypes[]` | exact items match by id; aggregate commands use provider group/archetype rows; playtime <- `timeIn`. |
| class snapshots | kit segments | `classes[]` | skip the aggregate `"All"` row; KD <- `killDeath`; deployments <- `spawns`. |

### Item (gadget/vehicle) matching

gametools returns items with an `id` (e.g. `gad_rl_ungui`, `veh_sur_m1a2sepv3`) that
matches the `exactKeys` already maintained in `utils/bf6gadgets.ts` and
`utils/bf6vehicles.ts`. The gametools adapter therefore reuses the same definitions and
matches on lowercase id. Aggregate vehicle commands (`helicopter`, `planes`, `mbt`,
etc.) map to gametools group/archetype rows; ground transport and dirt bikes aggregate
their matching individual vehicles.

Only the top-level gametools payload exposes a human-vs-AI kill split. Overall kills use
`dividedKills.human`; weapon, class, gadget, and vehicle breakdowns use the provider's
available per-item kill counts, which may include AI kills.

Individual gadgets and vehicles map one-to-one where their IDs match. For example,
tracker and gametools both identify RPG-7V2 as `gad_rl_ungui`; a pre/post-provider
comparison showed matching RPG values apart from legitimate play after the older scrape.
Aggregate categories are provider-derived rather than universally one-to-one. Helicopter
combines attack/scout/transport archetypes, while attack-helicopter combines attack/scout,
to match tracker semantics; ground transport remains the least exact aggregate.

## Schema changes

`db/schema.ts` + committed drizzle migrations:

- `bf6_scrapes.source` — `text not null default 'tracker'`. Records which provider a
  scrape came from (decided: track provenance explicitly).
- `bf6_scrapes.career_player_rank` — becomes **nullable**. Existing tracker rows keep
  their values; gametools scrapes insert NULL.

`PlayerRank.careerPlayerRank` becomes `number | null` accordingly.

### Player alias history

The upstream identity endpoints expose only the current handle, not rename history. The
bot builds history from configured aliases and handles observed during refreshes in
`bf6_player_aliases`:

- `player_id` - stable local player row.
- `namespace` - `tracker`, `ea`, or `steam`.
- `handle` / `normalized_handle` - display value and case-insensitive identity key.
- `source` - where the alias was first learned (`manual`, `tracker`, or `gametools`).
- `first_seen_at` / `last_seen_at` - observation range.

The unique key is `(player_id, namespace, normalized_handle)`. Configured `nicks` are
inserted once with source `manual`. Each successful provider refresh upserts the current
handle and advances `last_seen_at`; it never rewrites `bf6players.json`. Existing
`bf6_players.platform_user_handle` values are seeded by the migration as tracker aliases.

## Leaderboard behavior

- `bf6 ... rank`: players with a NULL rank display `Rank —`; sorts place NULLs last.
- All other sorts (kills, revives, items, classes, playstyle) unaffected.

## Provider selection / rollout

- `BF6_STATS_PROVIDER` env: `gametools` (default) or `tracker`.
- Tracker code stays available as an explicit fallback.

### Request policy and concurrency

GameTools documents the API as free and public and exposes `/bf6/multiple/` for up to 128
players, but publishes no numeric rate limit. The bot retains its six-hour cache and makes
only four scheduled refreshes per day. GameTools individual profile requests run with
bounded concurrency 3 (`BF6_FETCH_CONCURRENCY`, clamped to 1-5); tracker stays sequential
with a one-second gap. The batch endpoint is not used because its response omits
`userName`, which would prevent automatic alias-change detection.

## Open items

- tracker.gg remains blocked; kept only as a fallback provider, not actively bypassed.

## Verification

- `bun test`, including provider adapter and status-handling coverage.
- `bun run typecheck`.
- Live smoke test: gametools adapter on one resolved player, comparing kills/revives
  against the last tracker scrape.
