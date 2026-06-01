# dis-bot

## Documentation

The project includes an interactive DeepWiki index with architecture,
code explanations, dependency mapping, and repository navigation.

- DeepWiki: https://deepwiki.com/leog91/dis-bot

## Overview

`dis-bot` is a Discord bot with text and audio commands. It supports a split setup where
public code lives in this repo and optional private assets/commands live in a separate repo.
Private commands override public ones by name, and private audio/assets are searched first.

## Tech Stack

- Bun (runtime)
- TypeScript
- discord.js
- SQLite + Drizzle ORM

## Quick Start

1. Install dependencies:

```
bun install
```

2. Create a `.env` file with at least:

```
BOT_TOKEN=your_discord_bot_token
DB_FILE_PATH=../dis-bot-assets-private/sqlite.db
```

3. Optional private repo variables:

```
ASSETS_PRIVATE_DIR=/home/user/repo/dis-bot-assets-private
PRIVATE_COMMANDS_DIR=/home/user/repo/dis-bot-assets-private/commands
BF6_PLAYERS_CONFIG_PATH=/home/user/repo/dis-bot-assets-private/config/bf6players.json
CRASH_COUNTER_FILE_PATH=/home/user/repo/dis-bot-assets-private/crashcounter.json
SERVER_SETTINGS_PATH=/home/user/repo/dis-bot-assets-private/config/server-settings.json
USERS_PENDING_PATH=/home/user/repo/dis-bot-assets-private/config/users-pending.json
```

`DB_FILE_PATH` can be absolute or relative to this repo directory. `DB_FILE_NAME` is still
accepted for backward compatibility, but `DB_FILE_PATH` is preferred.
`BF6_PLAYERS_CONFIG_PATH` is optional; if not set and `ASSETS_PRIVATE_DIR` is set, the bot
defaults to `${ASSETS_PRIVATE_DIR}/config/bf6players.json`.
`CRASH_COUNTER_FILE_PATH` is optional; if not set and `ASSETS_PRIVATE_DIR` is set, the bot
defaults to `${ASSETS_PRIVATE_DIR}/crashcounter.json`.
`SERVER_SETTINGS_PATH` and `USERS_PENDING_PATH` default to the private repo `config/` folder
when `ASSETS_PRIVATE_DIR` is set.

4. Run the bot:

```
bun run dev
```

On startup, Drizzle migrations are applied automatically to the configured `DB_FILE_PATH`.
You can also run them manually:

`bun run db:migrate`

## Private Assets

You can keep private audio/images in a separate GitHub repo and point the bot to a local clone.

1. Clone your private assets repo locally:

```
git clone git@github.com:<you>/dis-bot-assets-private.git /home/user/repo/dis-bot-assets-private
```

2. Put assets in the expected structure:

```
/home/user/repo/dis-bot-assets-private/
  audio/
  images/
  config/
    games.ts
    users.ts
    game-access.ts
    bf6players.json
```

3. Set the environment variable:

```
ASSETS_PRIVATE_DIR=/home/user/repo/dis-bot-assets-private
```

When set, the bot searches:

1. `${ASSETS_PRIVATE_DIR}/audio/...` (private)
2. `assets/audio/...` (public repo)

This keeps your public GitHub repo clean while still letting private, server-specific assets work.

## Private Game Access

Game access configuration is defined in TypeScript inside the private repo.
This provides compile-time safety, autocomplete, and a single source of truth for game identifiers.

### Files

| File | Purpose |
|---|---|
| `config/games.ts` | Single source of truth for game identifiers. Add every new game here first. |
| `config/users.ts` | User registry, roles, purchases, and optional voice greeting settings (nicknames, ttsLang, greetingText, ttsGreetingEnabled). |
| `config/game-access.ts` | Credentials, guides, and aliases for each game. Keys are typed as `Record<GameKey, GameConfig>`. |

### Adding a new game

1. **Register the key** in `config/games.ts`:

```ts
export const Games = {
    ForzaHorizon6: "forza-horizon-6",
    Helldivers2: "helldivers-2",   // <-- add here
} as const;
```

2. **Add the game config** in `config/game-access.ts`:

```ts
export const gameAccess: Record<GameKey, GameConfig> = {
    [Games.ForzaHorizon6]: { ... },
    [Games.Helldivers2]: {            // <-- add here
        title: "Helldivers 2",
        aliases: ["hd2", "helldivers2"],
        credentials: { ... },
        guide: { ... },
    },
};
```

3. **Assign to users** in `config/users.ts`:

```ts
purchases: [Games.ForzaHorizon6, Games.Helldivers2],
```

Because purchases are typed as `GameKey[]`, TypeScript will error if you mistype or use a string literal instead of `Games.*`.

### Why TypeScript instead of JSON?

- **No silent typos**: `purchases: [Games.Helldivers2]` is checked at compile time.
- **Single source of truth**: The `Games` constant lives in one file and is imported everywhere.
- **IDE autocomplete**: Your editor suggests valid game names when typing.
- **Refactoring safety**: Rename a game in `games.ts` and TypeScript will flag every broken reference.

### Supported command format

```
account game:helldivers 2
guide game:helldivers 2
```

### Security notes

- `account` never posts credentials in a public channel.
- Buyers are matched by Discord user ID from the private `users.ts` purchase list.
- Friendly user keys like `timmy` can live in `users.ts`, while `game-access.ts` stays focused on credentials and guides.
- If a DM cannot be delivered, the bot only tells the user to enable DMs and retry.
- Restart the bot (`bun run dev`) after editing the TS configs — they are imported at startup.

## Voice Greetings

The bot can greet users with TTS when they join a voice channel the bot is already in.

### How it works

1. A user joins a voice channel where the bot is present.
2. The bot checks `config/server-settings.json` to see if `greeting` is enabled for that server.
3. The bot looks up the user in `config/users.ts`.
   - If the user is found and `ttsGreetingEnabled: true`, the bot speaks a greeting using a random nickname.
   - If the user is **not** found, they are added to `config/users-pending.json` so you can register them later.

### Enabling for a server

Edit or create `config/server-settings.json`:

```json
{
  "YOUR_GUILD_ID": {
    "greeting": true,
    "name": "My Cool Server"
  }
}
```

The `name` field is optional; the bot auto-updates it on the next greeting event.

### Configuring a user

In `config/users.ts`, add the optional greeting fields:

```ts
timmy: {
    discordId: "discord-id",
    displayName: "timm",
    nicknames: ["timmy", "tim", ],
    ttsGreetingEnabled: true,
    ttsLang: "en",
    greetingText: "welcome back {nickname}",
    purchases: [Games.funnyGame],
    roles: ["admin", "tester"],
    notes: [],
},
```

| Field | Default | Description |
|---|---|---|
| `nicknames` | — | List of names. One is picked at random for the greeting. Falls back to `displayName` if empty. |
| `ttsGreetingEnabled` | `false` | **Must be `true`** for the bot to greet this user. Opt-in by design. |
| `ttsLang` | `"es"` | Language code for Google TTS (`en`, `es`, `fr`, etc.). |
| `greetingText` | `"Hola {nickname}"` | Greeting template. Use `{nickname}` as a placeholder. If the template omits `{nickname}`, the nickname is appended automatically. |

### Unknown user tracking

When an unregistered user joins a voice channel, the bot creates an entry in `config/users-pending.json`:

```json
{
  "server-id": {
    "displayName": "someUser",
    "seenAt": "2026-06-01T18:00:00.000Z",
    "lastSeenAt": "2026-06-01T20:15:30.000Z",
    "joinCount": 5,
    "lastSeenServer": "My Cool Server"
  }
}
```

This lets you see how active an unknown user is before deciding to add them to `users.ts`.

## Private Commands

If you want server-specific commands (like `command.ts`) to stay out of the public repo, put them in your private repo and set `PRIVATE_COMMANDS_DIR`.

Example structure:

```
/home/user/repo/dis-bot-assets-private/
  commands/
    audio/
      command.ts
```

Set:

```
PRIVATE_COMMANDS_DIR=/home/user/repo/dis-bot-assets-private/commands
```

On startup, the bot loads commands from:

1. `./commands` (public repo)
2. `${PRIVATE_COMMANDS_DIR}` (private repo)

Private commands override public ones if they share the same name.

### Command Permissions + Constants

Commands support permission rules via `permissions`:

- `USER` (allow specific user IDs)
- `ROLE` (allow specific role IDs)
- `GUILD` (allow specific guild/server IDs)
- `OWNER` (bot application owner only)
- `CUSTOM` (custom check function)

Example:

```ts
permissions: [{ type: "GUILD", ids: [guilds.Bytes, guilds.plll] }];
```

For sensitive/server-specific commands, keep the command files in `dis-bot-assets-private/commands`.
Store IDs/constants in `dis-bot-assets-private/utils/constants.ts`, and import them directly in
command files that require private IDs.

## Private/Public Summary

- Public commands load first, private commands load after and override by name.
- Audio/assets search order is private first, then public.
- Private assets/commands live outside this repo and are configured via environment variables.
- Game access and user data are defined in TypeScript in the private repo (`config/games.ts`, `config/users.ts`, `config/game-access.ts`) and imported directly — no JSON files needed.
- SQLite can live outside this repo via `DB_FILE_PATH` (for example in `../dis-bot-assets-private/sqlite.db`).
- Crash tracker file can live outside this repo via `CRASH_COUNTER_FILE_PATH`.

## Typecheck Private Commands

To validate types across public + private commands:

```
bun run typecheck:private
```

This uses `tsconfig.private.json` which includes:

- Public repo TypeScript files
- `../dis-bot-assets-private/commands/**/*.ts`
- `../dis-bot-assets-private/config/**/*.ts`
- `../dis-bot-assets-private/utils/**/*.ts`

If your private repo lives elsewhere, update `tsconfig.private.json` accordingly.

## VS Code Multi-Root Workspace

If you want full IntelliSense for both public and private commands, open the multi-root workspace:

```
code dis-bot.code-workspace
```

This workspace includes:

- `./`
- `../dis-bot-assets-private`

If your private repo lives elsewhere, edit `dis-bot.code-workspace`.

For portability, you can use the relative-path workspace template:

```
code dis-bot.code-workspace.example
```

This assumes your private repo is a sibling folder named `dis-bot-assets-private`.
