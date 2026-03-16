import { db } from "../db/index";
import { bf6ItemSnapshots, bf6Scrapes, bf6Players, bf6WeaponPlaystyles, bf6ClassSnapshots } from "../db/schema";
import { desc, eq, sql, and, lt, gt, inArray, lte } from "drizzle-orm";
import { PlayerRank, updateBf6Data } from "./bf6rank";

// ================= CONFIG =================
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
// ==========================================

export type BF6ItemLeaderboardKey =
    | "rpg"
    | "c4"
    | "mines"
    | "m15"
    | "m18a1"
    | "knife"
    | "frag"
    | "mbt"
    | "ifv"
    | "vehicles"
    | "helicopter"
    | "planes";

export type BF6ItemSortKey = "kills" | "timePlayed";

export type BF6ItemLeaderboardRow = {
    playerId: string;
    user: string;
    platformUserHandle: string;
    profileUrl: string;
    kills: number;
    timePlayedValue: number;
    timePlayedDisplay: string;
};

/**
 * Fetches the latest scrape data for all players
 */
export const getLatestScrapes = async () => {
    const latestDates = db.select({
        maxDate: sql`MAX(${bf6Scrapes.scrapedAt})`
    }).from(bf6Scrapes).groupBy(bf6Scrapes.playerId);

    return await db.select({
        id: bf6Players.id,
        user: bf6Players.user,
        platformUserHandle: bf6Players.platformUserHandle,
        profileUrl: bf6Players.profileUrl,
        kills: bf6Scrapes.kills,
        deaths: bf6Scrapes.deaths,
        revives: bf6Scrapes.revives,
        score: bf6Scrapes.score,
        careerPlayerRank: bf6Scrapes.careerPlayerRank,
        timePlayedDisplay: bf6Scrapes.timePlayedDisplay,
        timePlayedValue: bf6Scrapes.timePlayedValue,
        scrapedAt: bf6Scrapes.scrapedAt,
    })
        .from(bf6Scrapes)
        .innerJoin(bf6Players, eq(bf6Scrapes.playerId, bf6Players.id))
        .where(
            inArray(bf6Scrapes.scrapedAt, latestDates)
        );
}

/**
 * Calculates progress data for a given timeframe
 * @param daysInfo - Time period in format: "7d", "1w", "1m"
 * @returns Progress data with calculated differences, or null if invalid
 */
export async function getProgressData(daysInfo: string): Promise<{ data: any[], timeframeLabel: string } | null> {
    // 1. Parse days
    let days = 0;
    if (daysInfo.endsWith("d")) days = parseInt(daysInfo.replace("d", ""));
    else if (daysInfo.endsWith("w")) days = parseInt(daysInfo.replace("w", "")) * 7;
    else if (daysInfo.endsWith("m")) days = parseInt(daysInfo.replace("m", "")) * 30;
    else return null;

    if (isNaN(days) || days <= 0) return null;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);

    // 2. Fetch Latest Data
    const currentData = await getLatestScrapes();
    if (!currentData.length) return null;

    // 3. Fetch Historical Data (OPTIMIZED with FALLBACK)
    // Strategy: We need to find a baseline for each player.
    // Priority 1: The most recent scrape <= targetDate (True history).
    // Priority 2: The oldest scrape available (if tracking started < days ago).

    // Fetch scrapes <= targetDate (for historical comparison)
    const historicalScrapes = await db.select({
        playerId: bf6Scrapes.playerId,
        kills: bf6Scrapes.kills,
        deaths: bf6Scrapes.deaths,
        revives: bf6Scrapes.revives,
        score: bf6Scrapes.score,
        timePlayedValue: bf6Scrapes.timePlayedValue,
        scrapedAt: bf6Scrapes.scrapedAt,
    })
        .from(bf6Scrapes)
        .where(lte(bf6Scrapes.scrapedAt, targetDate))
        .orderBy(bf6Scrapes.scrapedAt);

    // Get the oldest scrape for each player (fallback for new players)
    const oldestScrapesSubquery = db.select({
        playerId: bf6Scrapes.playerId,
        minDate: sql`MIN(${bf6Scrapes.scrapedAt})`.as('minDate')
    })
        .from(bf6Scrapes)
        .groupBy(bf6Scrapes.playerId)
        .as('oldest');

    const oldestScrapes = await db.select({
        playerId: bf6Scrapes.playerId,
        kills: bf6Scrapes.kills,
        deaths: bf6Scrapes.deaths,
        revives: bf6Scrapes.revives,
        score: bf6Scrapes.score,
        timePlayedValue: bf6Scrapes.timePlayedValue,
        scrapedAt: bf6Scrapes.scrapedAt,
    })
        .from(bf6Scrapes)
        .innerJoin(
            oldestScrapesSubquery,
            and(
                eq(bf6Scrapes.playerId, oldestScrapesSubquery.playerId),
                eq(bf6Scrapes.scrapedAt, oldestScrapesSubquery.minDate)
            )
        );

    // Group historical scrapes by player
    const historicalMap = new Map<string, typeof historicalScrapes>();
    historicalScrapes.forEach(scrape => {
        if (!historicalMap.has(scrape.playerId)) {
            historicalMap.set(scrape.playerId, []);
        }
        historicalMap.get(scrape.playerId)!.push(scrape);
    });

    // Create oldest scrapes map
    const oldestMap = new Map();
    oldestScrapes.forEach(scrape => {
        oldestMap.set(scrape.playerId, scrape);
    });

    // 4. Find the best baseline for each player
    const baselineMap = new Map();

    currentData.forEach(curr => {
        const historical = historicalMap.get(curr.id);

        if (historical && historical.length > 0) {
            // Priority 1: Use the most recent historical scrape <= targetDate
            const baseline = historical[historical.length - 1];
            baselineMap.set(curr.id, baseline);
        } else {
            // Priority 2: Use the oldest scrape available (fallback)
            const oldest = oldestMap.get(curr.id);
            if (oldest) {
                baselineMap.set(curr.id, oldest);
            }
        }
    });

    const progress = currentData.map(curr => {
        const past = baselineMap.get(curr.id);
        if (!past) {
            // No historical data at all - player is brand new
            return { ...curr, kills: 0, deaths: 0, revives: 0, score: 0, timePlayedValue: 0, isNew: true };
        }

        // Calculate the difference between current and baseline
        return {
            ...curr,
            kills: curr.kills - past.kills,
            deaths: curr.deaths - past.deaths,
            revives: curr.revives - past.revives,
            score: curr.score - past.score,
            timePlayedValue: curr.timePlayedValue - past.timePlayedValue,
            isNew: false
        };
    });

    return { data: progress, timeframeLabel: `Last ${daysInfo}` };
}

/**
 * Gets BF6 data from cache or fetches fresh data if stale
 */
export async function getBF6Data(): Promise<any[]> {
    try {
        const latestScrapes = await getLatestScrapes();

        if (!latestScrapes.length) {
            console.log("No DB data found. Will fetch fresh data.");
            return await updateBf6Data();
        }

        // Check freshness
        const newestScrapeTime = latestScrapes.reduce((max, curr) =>
            curr.scrapedAt.getTime() > max ? curr.scrapedAt.getTime() : max, 0
        );
        const age = Date.now() - newestScrapeTime;

        if (age < CACHE_DURATION) {
            return latestScrapes;
        } else {
            console.log("DB data stale. Will fetch fresh data.");
            return await updateBf6Data();
        }

    } catch (err) {
        console.error("DB Error:", err);
        console.log("Fallback to direct fetch.");
    }
    return await updateBf6Data();
}

/**
 * Force refresh BF6 data (ignores cache)
 */
export async function refreshBF6Data(): Promise<{
    data: PlayerRank[];
    durationMs: number;
}> {
    const start = performance.now();
    const data = await updateBf6Data();
    const end = performance.now();

    return {
        data,
        durationMs: end - start,
    };
}

/**
 * Gets latest stored weapon playstyle rows for a specific player (fresh snapshot only)
 */
export async function getPlayerWeaponPlaystyle(userInput: string) {
    const normalized = userInput.trim().toLowerCase();
    if (!normalized) return null;

    const players = await db.select({
        id: bf6Players.id,
        platformUserHandle: bf6Players.platformUserHandle,
        user: bf6Players.user,
    }).from(bf6Players);

    const exact = players.find((p) =>
        p.id.toLowerCase() === normalized ||
        p.user.toLowerCase() === normalized ||
        p.platformUserHandle.toLowerCase() === normalized
    );

    const contains = players.find((p) =>
        p.user.toLowerCase().includes(normalized) ||
        p.platformUserHandle.toLowerCase().includes(normalized)
    );

    const matched = exact ?? contains;
    if (!matched) return null;

    const weapons = await db.select({
        weaponName: bf6WeaponPlaystyles.weaponName,
        kills: bf6WeaponPlaystyles.kills,
        timePlayedDisplay: bf6WeaponPlaystyles.timePlayedDisplay,
        timePlayedValue: bf6WeaponPlaystyles.timePlayedValue,
        adsPct: bf6WeaponPlaystyles.adsPct,
        hipfirePct: bf6WeaponPlaystyles.hipfirePct,
        headshotPct: bf6WeaponPlaystyles.headshotPct,
        accuracyPct: bf6WeaponPlaystyles.accuracyPct,
    })
        .from(bf6WeaponPlaystyles)
        .where(eq(bf6WeaponPlaystyles.playerId, matched.id))
        .orderBy(desc(bf6WeaponPlaystyles.timePlayedValue));

    return {
        playerId: matched.id,
        user: matched.user,
        platformUserHandle: matched.platformUserHandle,
        weapons,
    };
}

export async function getItemLeaderboard(
    item: BF6ItemLeaderboardKey,
    sortBy: BF6ItemSortKey = "kills"
): Promise<BF6ItemLeaderboardRow[]> {
    await getBF6Data();

    const trackedPlayers = await db.select({
        id: bf6Players.id,
        user: bf6Players.user,
        platformUserHandle: bf6Players.platformUserHandle,
        profileUrl: bf6Players.profileUrl,
    }).from(bf6Players);

    const snapshots = await db.select({
        playerId: bf6ItemSnapshots.playerId,
        itemKey: bf6ItemSnapshots.itemKey,
        kills: bf6ItemSnapshots.kills,
        timePlayedValue: bf6ItemSnapshots.timePlayedValue,
        timePlayedDisplay: bf6ItemSnapshots.timePlayedDisplay,
    })
        .from(bf6ItemSnapshots)
        .where(eq(bf6ItemSnapshots.itemKey, item));

    const snapshotByPlayer = new Map(
        snapshots.map((s) => [s.playerId, s])
    );

    const rows: BF6ItemLeaderboardRow[] = trackedPlayers.map((player) => {
        const snap = snapshotByPlayer.get(player.id);
        return {
            playerId: player.id,
            user: player.user,
            platformUserHandle: player.platformUserHandle,
            profileUrl: player.profileUrl,
            kills: snap?.kills ?? 0,
            timePlayedValue: snap?.timePlayedValue ?? 0,
            timePlayedDisplay: snap?.timePlayedDisplay ?? "0s",
        };
    });

    return [...rows].sort((a, b) => {
        if (sortBy === "timePlayed") return b.timePlayedValue - a.timePlayedValue;
        return b.kills - a.kills;
    });
}

export type BF6ClassKey = "kit_assault" | "kit_engineer" | "kit_support" | "kit_recon";

type ClassSnapshotRow = {
    playerId: string;
    classKey: string;
    className: string;
    timePlayedValue: number;
    timePlayedDisplay: string;
    kills: number;
    deaths: number;
    assists: number;
    revives: number;
    deployments: number;
    kdRatio: number;
};

export type BF6ClassLeaderboardRow = {
    playerId: string;
    user: string;
    platformUserHandle: string;
    profileUrl: string;
    className: string;
    timePlayedValue: number;
    timePlayedDisplay: string;
    kills: number;
    deaths: number;
    assists: number;
    revives: number;
    deployments: number;
    kdRatio: number;
};

export async function getClassLeaderboard(
    classKey: BF6ClassKey,
    sortBy: "kills" | "timePlayed" | "kd" | "deployments" = "kills"
): Promise<BF6ClassLeaderboardRow[]> {
    await getBF6Data();

    const trackedPlayers = await db.select({
        id: bf6Players.id,
        user: bf6Players.user,
        platformUserHandle: bf6Players.platformUserHandle,
        profileUrl: bf6Players.profileUrl,
    }).from(bf6Players);

    const snapshots = await db.select({
        playerId: bf6ClassSnapshots.playerId,
        classKey: bf6ClassSnapshots.classKey,
        className: bf6ClassSnapshots.className,
        timePlayedValue: bf6ClassSnapshots.timePlayedValue,
        timePlayedDisplay: bf6ClassSnapshots.timePlayedDisplay,
        kills: bf6ClassSnapshots.kills,
        deaths: bf6ClassSnapshots.deaths,
        assists: bf6ClassSnapshots.assists,
        revives: bf6ClassSnapshots.revives,
        deployments: bf6ClassSnapshots.deployments,
        kdRatio: bf6ClassSnapshots.kdRatio,
    })
        .from(bf6ClassSnapshots)
        .where(eq(bf6ClassSnapshots.classKey, classKey)) as unknown as ClassSnapshotRow[];

    const snapshotByPlayer = new Map(
        snapshots.map((s) => [s.playerId, s])
    );

    const rows: BF6ClassLeaderboardRow[] = trackedPlayers.map((player) => {
        const snap = snapshotByPlayer.get(player.id);
        return {
            playerId: player.id,
            user: player.user,
            platformUserHandle: player.platformUserHandle,
            profileUrl: player.profileUrl,
            className: snap?.className ?? classKey.replace("kit_", ""),
            timePlayedValue: snap?.timePlayedValue ?? 0,
            timePlayedDisplay: snap?.timePlayedDisplay ?? "0s",
            kills: snap?.kills ?? 0,
            deaths: snap?.deaths ?? 0,
            assists: snap?.assists ?? 0,
            revives: snap?.revives ?? 0,
            deployments: snap?.deployments ?? 0,
            kdRatio: snap?.kdRatio ?? 0,
        };
    });

    return [...rows].sort((a, b) => {
        switch (sortBy) {
            case "timePlayed": return b.timePlayedValue - a.timePlayedValue;
            case "kd": return b.kdRatio - a.kdRatio;
            case "deployments": return b.deployments - a.deployments;
            default: return b.kills - a.kills;
        }
    });
}

export async function getPlayerClassStats(userInput: string) {
    const normalized = userInput.trim().toLowerCase();
    if (!normalized) return null;

    const players = await db.select({
        id: bf6Players.id,
        platformUserHandle: bf6Players.platformUserHandle,
        user: bf6Players.user,
    }).from(bf6Players);

    const exact = players.find((p) =>
        p.id.toLowerCase() === normalized ||
        p.user.toLowerCase() === normalized ||
        p.platformUserHandle.toLowerCase() === normalized
    );

    const contains = players.find((p) =>
        p.user.toLowerCase().includes(normalized) ||
        p.platformUserHandle.toLowerCase().includes(normalized)
    );

    const matched = exact ?? contains;
    if (!matched) return null;

    const classes = await db.select({
        classKey: bf6ClassSnapshots.classKey,
        className: bf6ClassSnapshots.className,
        timePlayedValue: bf6ClassSnapshots.timePlayedValue,
        timePlayedDisplay: bf6ClassSnapshots.timePlayedDisplay,
        kills: bf6ClassSnapshots.kills,
        deaths: bf6ClassSnapshots.deaths,
        assists: bf6ClassSnapshots.assists,
        revives: bf6ClassSnapshots.revives,
        deployments: bf6ClassSnapshots.deployments,
        kdRatio: bf6ClassSnapshots.kdRatio,
    })
        .from(bf6ClassSnapshots)
        .where(eq(bf6ClassSnapshots.playerId, matched.id))
        .orderBy(desc(bf6ClassSnapshots.timePlayedValue)) as unknown as Omit<ClassSnapshotRow, "playerId" | "classKey">[];

    return {
        playerId: matched.id,
        user: matched.user,
        platformUserHandle: matched.platformUserHandle,
        classes,
    };
}
