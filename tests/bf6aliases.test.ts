import { describe, expect, it } from "bun:test";
import { fetchGameToolsAliases, fetchSteamAliases } from "../utils/bf6aliases";
import { matchBF6Player } from "../utils/bf6identity";
import { createPlayerAliasRefresher } from "../utils/bf6aliasStore";
import type { Player, PlayerAlias } from "../utils/bf6providers/types";

const steamId64 = "76561198000000001";

describe("on-demand nickname refresh", () => {
    const player: Player = {
        id: "30001", userName: "player-one", personaId: "10001", nucleusId: "20001",
        configuredAliases: [{ namespace: "ea", source: "manual", handle: "Configured Name" }],
    };

    it("imports config immediately and fetches names without a stats refresh, throttling repeat requests", async () => {
        let time = 0;
        let requests = 0;
        const saved: PlayerAlias[] = [];
        const refresh = createPlayerAliasRefresher(async () => {
            requests++;
            return [{ namespace: "steam", source: "steam", handle: "Live Name" }];
        }, async (_player, aliases) => { saved.push(...aliases); }, () => time);
        await refresh(player);
        expect(requests).toBe(1);
        expect(saved.map(alias => alias.handle)).toEqual(["Configured Name", "Live Name"]);
        await refresh({ ...player, configuredAliases: [{ namespace: "ea", source: "manual", handle: "New Config Name" }] });
        expect(requests).toBe(1);
        expect(saved.at(-1)?.handle).toBe("New Config Name");
        time = 60_000;
        await refresh(player);
        expect(requests).toBe(2);
        await refresh(player, true);
        expect(requests).toBe(3);
    });

    it("retains configured names when live collection is unavailable and permits retry after failure", async () => {
        let requests = 0;
        const saved: PlayerAlias[] = [];
        const refresh = createPlayerAliasRefresher(async () => {
            if (++requests === 1) throw new Error("Unavailable");
            return [];
        }, async (_player, aliases) => { saved.push(...aliases); });
        await expect(refresh(player)).rejects.toThrow("Unavailable");
        expect(saved.map(alias => alias.handle)).toEqual(["Configured Name"]);
        await refresh(player);
        expect(requests).toBe(2);
    });

    it("shares an in-flight identity lookup for concurrent nickname requests", async () => {
        let requests = 0;
        let finish!: (aliases: PlayerAlias[]) => void;
        const response = new Promise<PlayerAlias[]>(resolve => { finish = resolve; });
        const refresh = createPlayerAliasRefresher(async () => { requests++; return response; }, async () => {});
        const first = refresh(player);
        const second = refresh(player);
        await Promise.resolve();
        expect(requests).toBe(1);
        finish([]);
        await Promise.all([first, second]);
    });
});

describe("BF6 alias discovery", () => {
    it("collects current Steam names and deduplicates recent aliases without losing Unicode", async () => {
        const fetcher = (async (input: string) => input.includes("xml=1")
            ? new Response(`<profile><steamID64>${steamId64}</steamID64><steamID><![CDATA[Player-Álpha New Name]]></steamID></profile>`)
            : Response.json([
                { newname: "Player-Álpha New Name" },
                { newname: "[Team] Player One" },
                { newname: " [team] PLAYER one " },
                { newname: "" }, { newname: 100 },
            ]));
        expect(await fetchSteamAliases(steamId64, fetcher)).toEqual([
            { namespace: "steam", source: "steam", handle: "Player-Álpha New Name" },
            { namespace: "steam", source: "steam", handle: "[team] PLAYER one" },
        ]);
    });

    it("keeps the current name if Steam history is unavailable and decodes XML entities", async () => {
        const fetcher = (async (input: string) => input.includes("xml=1")
            ? new Response(`<profile><steamID64>${steamId64}</steamID64><steamID>A &amp; B &#241;</steamID></profile>`)
            : new Response("Unavailable", { status: 503 }));
        const aliases = await fetchSteamAliases(steamId64, fetcher);
        expect(aliases.map(alias => alias.handle)).toEqual(["A & B ñ"]);
    });

    it("does not treat EA persona IDs as SteamID64 or call Steam for them", async () => {
        let requests = 0;
        const fetcher = async () => { requests++; return new Response(); };
        expect(await fetchSteamAliases("1000000000001", fetcher)).toEqual([]);
        expect(requests).toBe(0);
    });

    it("matches EA identity by persona ID instead of accepting a different player's name", async () => {
        const fetcher = (async () => Response.json({ results: [
            { personaId: 999, name: "Wrong account" }, { personaId: 10001, name: "New EA name" },
        ] }));
        expect(await fetchGameToolsAliases({ personaId: "10001" }, fetcher)).toEqual([
            { namespace: "ea", source: "gametools", handle: "New EA name" },
        ]);
        expect(await fetchGameToolsAliases({ personaId: "1234" }, fetcher)).toEqual([]);
    });

    it("collects linked EA and Steam names by stable nucleus ID from the live response shape", async () => {
        const fetcher = async (url: string) => {
            expect(url).toContain("nucleus_id=20001");
            return Response.json({ results: [
                { nucleusId: "20001", personaId: "10001", platform: "ea", username: "PlayerOneEA", displayName: "PlayerOneEA" },
                { nucleusId: "20001", personaId: "1000000000001", platform: "steam", username: "Player-Álpha New Name", displayName: "Player-Álpha New Name" },
                { nucleusId: "999", platform: "steam", username: "Wrong account" },
            ] });
        };
        expect(await fetchGameToolsAliases({ personaId: "10001", nucleusId: "20001" }, fetcher)).toEqual([
            { namespace: "ea", source: "gametools", handle: "PlayerOneEA" },
            { namespace: "steam", source: "gametools", handle: "Player-Álpha New Name" },
        ]);
    });

    it("sets a result limit and falls back to persona ID when the nucleus query is empty", async () => {
        const urls: string[] = [];
        const fetcher = async (url: string) => {
            urls.push(url);
            expect(url).toContain("limit=10");
            return Response.json({ results: url.includes("nucleus_id=") ? [] : [
                { personaId: "10001", nucleusId: "20001", platform: "ea", username: "PlayerOneEA", displayName: "New Display Name" },
            ] });
        };
        expect(await fetchGameToolsAliases({ personaId: "10001", nucleusId: "20001" }, fetcher)).toEqual([
            { namespace: "ea", source: "gametools", handle: "PlayerOneEA" },
            { namespace: "ea", source: "gametools", handle: "New Display Name" },
        ]);
        expect(urls).toHaveLength(2);
        expect(urls[1]).toContain("playerid=10001");
    });
});

describe("shared BF6 nickname lookup", () => {
    const players = [
        { id: "1", user: "player-one", platformUserHandle: "PlayerOneEA" },
        { id: "2", user: "other", platformUserHandle: "Other EA" },
    ];
    const aliases = [
        { playerId: "1", normalizedHandle: "player-álpha new name" },
        { playerId: "1", normalizedHandle: "[team] player one" },
        { playerId: "1", normalizedHandle: "shared name" },
        { playerId: "2", normalizedHandle: "shared name" },
    ];

    it("resolves old/full nicknames with spaces, punctuation and case-insensitive partial names", () => {
        for (const input of [" Player-Álpha New Name ", "Álpha", "[Team] Player One", "PlayerOneEA", "1"]) {
            expect(matchBF6Player(input, players, aliases)?.id).toBe("1");
        }
    });

    it("refuses ambiguous aliases instead of returning the first player", () => {
        expect(matchBF6Player("shared name", players, aliases)).toBeNull();
        expect(matchBF6Player("shared", players, aliases)).toBeNull();
        expect(matchBF6Player("", players, aliases)).toBeNull();
        expect(matchBF6Player("unknown", players, aliases)).toBeNull();
    });
});
