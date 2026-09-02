import {
    BF6_REQUEST_TIMEOUT_MS,
    type BF6StatsProvider,
    type Player,
    type PlayerFetchResult,
} from "./types";
import {
    extractClassSnapshots,
    extractItemSnapshots,
    extractWeaponPlaystyles,
} from "../bf6rank";

/**
 * Legacy tracker.gg provider. Scrapes the unofficial profile API. Currently blocked
 * upstream (403 + HTML block page); kept as a fallback. Do not extend — new work
 * should target a provider with an intended integration surface.
 */
async function fetchPlayer(
    player: Player,
    timeoutMs = BF6_REQUEST_TIMEOUT_MS,
): Promise<PlayerFetchResult> {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error(`request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        const url = `https://api.tracker.gg/api/v2/bf6/standard/profile/ign/${player.id}`;
        const response = await Promise.race([
            fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.9",
                },
                signal: controller.signal,
            }),
            timeout,
        ]);

        if (!response.ok) {
            if (response.status === 403) {
                if (response.headers?.get("content-type")?.includes("text/html")) {
                    console.error(
                        "❌ Tracker blocked BF6 API requests; stopping update. See https://tracker.gg/developers",
                    );
                    return { ok: false, status: "inactive", apiBlocked: true };
                }
                console.log(`🔒 ${player.userName}: profile private`);
                return { ok: false, status: "private" };
            }
            if (response.status === 404) {
                console.log(`❓ ${player.userName}: profile not found`);
                return { ok: false, status: "not_found" };
            }
            console.error(`❌ Failed to fetch ${player.userName}: Status ${response.status}`);
            return { ok: false, status: "inactive" };
        }

        const data = await Promise.race([response.json(), timeout]);

        const kills = data.data?.segments?.[0]?.stats?.playerKills?.value ?? 0;
        const deaths = data.data?.segments?.[0]?.stats?.deaths?.value ?? 0;
        const revives = data.data?.segments?.[0]?.stats?.revives?.value ?? 0;
        const score = data.data?.segments?.[0]?.stats?.score?.value ?? 0;
        const careerPlayerRank = data.data?.segments?.[0]?.stats?.careerPlayerRank?.value ?? null;
        const timePlayedDisplay = data.data?.segments?.[0]?.stats?.timePlayed?.displayValue ?? "N/A";
        const timePlayedValue = data.data?.segments?.[0]?.stats?.timePlayed?.value ?? 0;
        const profileUrl = `https://tracker.gg/bf6/profile/${player.id}/overview`;

        const platformUserHandle = data.data?.platformInfo?.platformUserHandle ?? "N/A";
        const weaponPlaystyles = extractWeaponPlaystyles(player.id, data);
        const itemSnapshots = extractItemSnapshots(player.id, data);
        const classSnapshots = extractClassSnapshots(player.id, data);

        console.log(`✅ ${player.userName}: ${kills} kills`);

        return {
            ok: true,
            data: {
                rank: {
                    id: player.id,
                    kills,
                    aiKills: null,
                    platformUserHandle,
                    user: player.userName,
                    deaths,
                    revives,
                    wins: null,
                    losses: null,
                    matchesPlayed: null,
                    damage: null,
                    shotsFired: null,
                    shotsHit: null,
                    killAssists: null,
                    heals: null,
                    resupplies: null,
                    repairs: null,
                    squadmateRevives: null,
                    enemiesSpotted: null,
                    score,
                    careerPlayerRank,
                    timePlayedDisplay,
                    timePlayedValue,
                    profileUrl,
                },
                weaponPlaystyles,
                itemSnapshots,
                classSnapshots,
            },
        };
    } catch (error) {
        console.error(`❌ Failed to fetch ${player.userName}:`, error);
        return { ok: false, status: "inactive" };
    } finally {
        clearTimeout(timeoutId!);
    }
}

export const trackerProvider: BF6StatsProvider = {
    name: "tracker",
    defaultConcurrency: 1,
    requestDelayMs: 1000,
    fetchPlayer,
};
