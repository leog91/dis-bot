import type { Player, PlayerAlias } from "./bf6providers/types";
import { BF6_REQUEST_TIMEOUT_MS } from "./bf6providers/types";
import { normalizeBF6AliasHandle } from "./bf6identity";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

function xmlText(xml: string, tag: string): string | undefined {
    const value = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1];
    if (value === undefined) return undefined;
    if (value.startsWith("<![CDATA[") && value.endsWith("]]>")) return value.slice(9, -3).trim();
    return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
        if (entity.startsWith("#")) {
            const number = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
            return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : "";
        }
        return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[entity.toLowerCase()] ?? "";
    }).trim();
}

async function request(url: string, fetcher: Fetcher) {
    const response = await fetcher(url, { signal: AbortSignal.timeout(BF6_REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
}

/** Steam's public community endpoints expose current and a limited, clearable recent list. */
export async function fetchSteamAliases(steamId64: string, fetcher: Fetcher = fetch): Promise<PlayerAlias[]> {
    if (!/^7656119\d{10}$/.test(steamId64)) return [];
    const profileUrl = `https://steamcommunity.com/profiles/${steamId64}/`;
    const names: string[] = [];
    try {
        const xml = await (await request(`${profileUrl}?xml=1`, fetcher)).text();
        if (xmlText(xml, "steamID64") !== steamId64) throw new Error("Steam identity mismatch");
        const current = xmlText(xml, "steamID");
        if (current) names.push(current);
    } catch (error) {
        console.warn(`Steam current name unavailable for ${steamId64}:`, error);
    }
    try {
        const history = await (await request(`${profileUrl}ajaxaliases/`, fetcher)).json();
        if (!Array.isArray(history)) throw new Error("Invalid Steam alias response");
        for (const alias of history) {
            if (typeof alias?.newname === "string" && alias.newname.trim()) names.push(alias.newname.trim());
        }
    } catch (error) {
        console.warn(`Steam recent names unavailable for ${steamId64}:`, error);
    }
    const unique = new Map(names.map(handle => [normalizeBF6AliasHandle(handle), handle]));
    return [...unique.values()].map(handle => ({ namespace: "steam", handle, source: "steam" }));
}

export async function fetchGameToolsAliases(player: Pick<Player, "personaId" | "nucleusId">, fetcher: Fetcher = fetch): Promise<PlayerAlias[]> {
    if (!player.personaId && !player.nucleusId) return [];
    try {
        const aliases = new Map<string, PlayerAlias>();
        const queries = player.nucleusId ? [`nucleus_id=${encodeURIComponent(player.nucleusId)}`] : [];
        if (player.personaId) queries.push(`playerid=${encodeURIComponent(player.personaId)}`);
        for (const query of queries) {
            try {
                const data = await (await request(`https://api.gametools.network/bf6/player/?${query}&limit=10`, fetcher)).json();
                if (!Array.isArray(data?.results)) continue;
                for (const result of data.results) {
                    const verified = query.startsWith("nucleus_id=")
                        ? String(result.nucleusId) === player.nucleusId
                        : String(result.personaId) === player.personaId;
                    if (!verified) continue;
                    const namespace = result.platform === "steam" ? "steam" : !result.platform || result.platform === "ea" ? "ea" : null;
                    if (!namespace) continue;
                    for (const handle of [result.username, result.displayName, result.name]) {
                        if (typeof handle !== "string" || !handle.trim()) continue;
                        aliases.set(`${namespace}:${normalizeBF6AliasHandle(handle)}`, { namespace, handle: handle.trim(), source: "gametools" });
                    }
                }
            } catch (error) {
                console.warn(`GameTools identity lookup failed (${query}):`, error);
            }
            if ([...aliases.values()].some(alias => alias.namespace === "ea")) break;
        }
        return [...aliases.values()];
    } catch (error) {
        console.warn(`GameTools names unavailable for EA account ${player.nucleusId ?? player.personaId}:`, error);
        return [];
    }
}

export async function fetchPlayerAliases(player: Player): Promise<PlayerAlias[]> {
    const [ea, steam] = await Promise.all([
        fetchGameToolsAliases(player),
        player.steamId64 ? fetchSteamAliases(player.steamId64) : Promise.resolve([]),
    ]);
    return [...ea, ...steam];
}
