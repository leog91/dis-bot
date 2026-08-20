import { db } from "../db/index";
import { bf6ItemSnapshots, bf6Scrapes, bf6Players, bf6WeaponPlaystyles, bf6ClassSnapshots, type BF6PlayerStatus } from "../db/schema";
import { desc, eq, sql, and, lt, gt, lte, gte } from "drizzle-orm";
import { PlayerRank, updateBf6Data } from "./bf6rank";
import type { BF6GadgetSnapshotKey } from "./bf6gadgets";
import type { BF6VehicleSnapshotKey } from "./bf6vehicles";

// ================= CONFIG =================
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
// ==========================================

export type BF6ItemLeaderboardKey = BF6GadgetSnapshotKey | BF6VehicleSnapshotKey;

export type BF6ItemSortKey = "kills" | "timePlayed";

export type BF6ItemLeaderboardRow = {
    playerId: string;
    user: string;
    platformUserHandle: string;
    profileUrl: string;
    status: BF6PlayerStatus;
    kills: number;
    timePlayedValue: number;
    timePlayedDisplay: string;
};

/**
 * Fetches the latest scrape data for all players
 */
export const getLatestScrapes = async () => {
    const latestPerPlayer = db.select({
        playerId: bf6Scrapes.playerId,
        maxDate: sql`MAX(${bf6Scrapes.scrapedAt})`.as('maxDate'),
    })
        .from(bf6Scrapes)
        .groupBy(bf6Scrapes.playerId)
        .as('latest');

    return await db.select({
        id: bf6Players.id,
        user: bf6Players.user,
        platformUserHandle: bf6Players.platformUserHandle,
        profileUrl: bf6Players.profileUrl,
        status: bf6Players.status,
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
        .innerJoin(
            latestPerPlayer,
            and(
                eq(bf6Scrapes.playerId, latestPerPlayer.playerId),
                eq(bf6Scrapes.scrapedAt, latestPerPlayer.maxDate)
            )
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

    // 2. Fetch Latest Data (only active players have meaningful current stats)
    const latestScrapes = await getLatestScrapes();
    const currentData = latestScrapes.filter((p) => p.status === "active");
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
    let latestScrapes: any[] | null = null;
    try {
        latestScrapes = await getLatestScrapes();

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
        }

        console.log("DB data stale. Will fetch fresh data.");
        const fresh = await updateBf6Data();
        if (fresh.length > 0) return fresh;

        console.log("API fetch failed. Falling back to stale DB data.");
        return latestScrapes;

    } catch (err) {
        console.error("DB Error:", err);
        console.log("Fallback to direct fetch.");
    }

    const fresh = await updateBf6Data();
    if (fresh.length > 0) return fresh;

    if (latestScrapes && latestScrapes.length > 0) {
        console.log("API fetch failed. Falling back to stale DB data.");
        return latestScrapes;
    }

    return [];
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
        status: bf6Players.status,
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
            status: player.status,
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
    status: BF6PlayerStatus;
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
        status: bf6Players.status,
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
            status: player.status,
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

export type MonthlyRow = {
    month: string;
    kills: number;
    deaths: number;
    timePlayedValue: number;
    timePlayedDisplay: string;
    kdRatio: number;
    status: "baseline" | "ok" | "resumed";
};

export type PlayerMonthRow = {
    playerId: string;
    user: string;
    platformUserHandle: string;
    kills: number;
    deaths: number;
    timePlayedValue: number;
    timePlayedDisplay: string;
    kdRatio: number;
    status: "baseline" | "ok" | "resumed" | "zero" | "private" | "inactive" | "not_found" | "not_tracked";
};

const MONTH_NAMES: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
};

export function resolveMonth(input: string): string | null {
    const normalized = input.trim().toLowerCase();

    const ymMatch = normalized.match(/^(\d{4})-(\d{2})$/);
    if (ymMatch) {
        const month = parseInt(ymMatch[2]);
        if (month >= 1 && month <= 12) return normalized;
        return null;
    }

    const monthNum = MONTH_NAMES[normalized];
    if (!monthNum) return null;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const year = monthNum > currentMonth ? now.getFullYear() - 1 : now.getFullYear();
    return `${year}-${String(monthNum).padStart(2, "0")}`;
}

export function formatHistoryTime(seconds: number): string {
    if (seconds <= 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export function previousCalendarMonth(ym: string): string {
    const [year, month] = ym.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function getMonthlyHistory(): Promise<MonthlyRow[]> {
    const allScrapes = await db.select({
        playerId: bf6Scrapes.playerId,
        kills: bf6Scrapes.kills,
        deaths: bf6Scrapes.deaths,
        timePlayedValue: bf6Scrapes.timePlayedValue,
        scrapedAt: bf6Scrapes.scrapedAt,
    })
        .from(bf6Scrapes)
        .orderBy(bf6Scrapes.scrapedAt);

    if (!allScrapes.length) return [];

    const byPlayerMonth = new Map<string, Map<string, { kills: number; deaths: number; timePlayedValue: number }>>();

    for (const s of allScrapes) {
        const month = `${s.scrapedAt.getFullYear()}-${String(s.scrapedAt.getMonth() + 1).padStart(2, "0")}`;
        if (!byPlayerMonth.has(s.playerId)) byPlayerMonth.set(s.playerId, new Map());
        byPlayerMonth.get(s.playerId)!.set(month, { kills: s.kills, deaths: s.deaths, timePlayedValue: s.timePlayedValue });
    }

    const allMonths = new Set<string>();
    for (const months of byPlayerMonth.values()) {
        for (const m of months.keys()) allMonths.add(m);
    }
    const sortedMonths = [...allMonths].sort();

    const result: MonthlyRow[] = [];

    for (let i = 0; i < sortedMonths.length; i++) {
        const month = sortedMonths[i];
        const isBaseline = i === 0;

        let totalKills = 0;
        let totalDeaths = 0;
        let totalTime = 0;

        for (const playerMonths of byPlayerMonth.values()) {
            const curr = playerMonths.get(month);
            if (!curr) continue;

            if (isBaseline) {
                // First tracked month is the baseline: show cumulative totals at start of tracking.
                totalKills += curr.kills;
                totalDeaths += curr.deaths;
                totalTime += curr.timePlayedValue;
                continue;
            }

            const previousPlayerMonth = [...playerMonths.keys()]
                .filter((playerMonth) => playerMonth < month)
                .sort()
                .at(-1);
            const prev = previousPlayerMonth ? playerMonths.get(previousPlayerMonth) : null;

            if (prev) {
                totalKills += curr.kills - prev.kills;
                totalDeaths += curr.deaths - prev.deaths;
                totalTime += curr.timePlayedValue - prev.timePlayedValue;
            } else {
                totalKills += curr.kills;
                totalDeaths += curr.deaths;
                totalTime += curr.timePlayedValue;
            }
        }

        const kd = totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) : totalKills * 100;

        result.push({
            month,
            kills: totalKills,
            deaths: totalDeaths,
            timePlayedValue: totalTime,
            timePlayedDisplay: formatHistoryTime(totalTime),
            kdRatio: kd,
            status: isBaseline ? "baseline" : "ok",
        });
    }

    return result;
}

export async function getPlayerMonthlyHistory(userInput: string): Promise<{
    player: { id: string; user: string; platformUserHandle: string };
    months: MonthlyRow[];
} | null> {
    const normalized = userInput.trim().toLowerCase();
    if (!normalized) return null;

    const players = await db.select({
        id: bf6Players.id,
        user: bf6Players.user,
        platformUserHandle: bf6Players.platformUserHandle,
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

    const playerScrapes = await db.select({
        kills: bf6Scrapes.kills,
        deaths: bf6Scrapes.deaths,
        timePlayedValue: bf6Scrapes.timePlayedValue,
        scrapedAt: bf6Scrapes.scrapedAt,
    })
        .from(bf6Scrapes)
        .where(eq(bf6Scrapes.playerId, matched.id))
        .orderBy(bf6Scrapes.scrapedAt);

    if (!playerScrapes.length) return null;

    const byMonth = new Map<string, { kills: number; deaths: number; timePlayedValue: number }>();
    for (const s of playerScrapes) {
        const month = `${s.scrapedAt.getFullYear()}-${String(s.scrapedAt.getMonth() + 1).padStart(2, "0")}`;
        byMonth.set(month, { kills: s.kills, deaths: s.deaths, timePlayedValue: s.timePlayedValue });
    }

    const sortedMonths = [...byMonth.keys()].sort();
    const months: MonthlyRow[] = [];

    for (let i = 0; i < sortedMonths.length; i++) {
        const month = sortedMonths[i];
        const curr = byMonth.get(month)!;
        const prevMonth = i > 0 ? sortedMonths[i - 1] : null;
        const prev = prevMonth ? byMonth.get(prevMonth) : null;

        let kills: number;
        let deaths: number;
        let time: number;
        let status: MonthlyRow["status"];

        if (prev) {
            kills = curr.kills - prev.kills;
            deaths = curr.deaths - prev.deaths;
            time = curr.timePlayedValue - prev.timePlayedValue;
            // If the previous active scrape is not the immediately preceding calendar month,
            // the player was missing in between (likely private) and has now resumed.
            status = previousCalendarMonth(month) === prevMonth ? "ok" : "resumed";
        } else if (i === 0) {
            // First tracked month for this player: cumulative baseline.
            kills = curr.kills;
            deaths = curr.deaths;
            time = curr.timePlayedValue;
            status = "baseline";
        } else {
            // No scrape in the immediately previous month but this isn't the first month:
            // the player was missing (likely private) and has resumed.
            kills = curr.kills;
            deaths = curr.deaths;
            time = curr.timePlayedValue;
            status = "resumed";
        }

        const kd = deaths > 0 ? Math.round((kills / deaths) * 100) : kills * 100;

        months.push({
            month,
            kills,
            deaths,
            timePlayedValue: time,
            timePlayedDisplay: formatHistoryTime(time),
            kdRatio: kd,
            status,
        });
    }

    return {
        player: { id: matched.id, user: matched.user, platformUserHandle: matched.platformUserHandle },
        months,
    };
}

export async function getMonthLeaderboard(
    monthStr: string,
    sortBy: "kills" | "deaths" | "timePlayed" | "kd" = "kills"
): Promise<PlayerMonthRow[]> {
    const [yearStr, monthNumStr] = monthStr.split("-");
    const targetYear = parseInt(yearStr);
    const targetMonth = parseInt(monthNumStr);

    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 1);

    const allPlayers = await db.select({
        id: bf6Players.id,
        user: bf6Players.user,
        platformUserHandle: bf6Players.platformUserHandle,
        status: bf6Players.status,
    }).from(bf6Players);

    const allScrapes = await db.select({
        playerId: bf6Scrapes.playerId,
        kills: bf6Scrapes.kills,
        deaths: bf6Scrapes.deaths,
        timePlayedValue: bf6Scrapes.timePlayedValue,
        timePlayedDisplay: bf6Scrapes.timePlayedDisplay,
        scrapedAt: bf6Scrapes.scrapedAt,
    })
        .from(bf6Scrapes)
        .where(lte(bf6Scrapes.scrapedAt, monthEnd))
        .orderBy(bf6Scrapes.scrapedAt);

    const byPlayer = new Map<string, typeof allScrapes>();
    for (const s of allScrapes) {
        if (!byPlayer.has(s.playerId)) byPlayer.set(s.playerId, []);
        byPlayer.get(s.playerId)!.push(s);
    }

    const results: PlayerMonthRow[] = [];

    for (const player of allPlayers) {
        const scrapes = byPlayer.get(player.id) || [];

        const inMonth = scrapes.filter((s) => s.scrapedAt >= monthStart && s.scrapedAt < monthEnd);
        const beforeMonth = scrapes.filter((s) => s.scrapedAt < monthStart);

        // If the profile is currently private/inactive and there is no fresh scrape
        // for this month, surface that status instead of generic zero/not_tracked.
        if (inMonth.length === 0) {
            if (beforeMonth.length === 0) {
                if (player.status === "private") {
                    results.push({
                        playerId: player.id,
                        user: player.user,
                        platformUserHandle: player.platformUserHandle,
                        kills: 0,
                        deaths: 0,
                        timePlayedValue: 0,
                        timePlayedDisplay: "-",
                        kdRatio: 0,
                        status: "private",
                    });
                } else if (player.status === "inactive" || player.status === "not_found") {
                    results.push({
                        playerId: player.id,
                        user: player.user,
                        platformUserHandle: player.platformUserHandle,
                        kills: 0,
                        deaths: 0,
                        timePlayedValue: 0,
                        timePlayedDisplay: "-",
                        kdRatio: 0,
                        status: player.status,
                    });
                } else {
                    results.push({
                        playerId: player.id,
                        user: player.user,
                        platformUserHandle: player.platformUserHandle,
                        kills: 0,
                        deaths: 0,
                        timePlayedValue: 0,
                        timePlayedDisplay: "-",
                        kdRatio: 0,
                        status: "not_tracked",
                    });
                }
            } else {
                results.push({
                    playerId: player.id,
                    user: player.user,
                    platformUserHandle: player.platformUserHandle,
                    kills: 0,
                    deaths: 0,
                    timePlayedValue: 0,
                    timePlayedDisplay: "0s",
                    kdRatio: 0,
                    status: "zero",
                });
            }
            continue;
        }

        const lastInMonth = inMonth[inMonth.length - 1];

        if (beforeMonth.length === 0) {
            const kd = lastInMonth.deaths > 0
                ? Math.round((lastInMonth.kills / lastInMonth.deaths) * 100)
                : lastInMonth.kills * 100;
            results.push({
                playerId: player.id,
                user: player.user,
                platformUserHandle: player.platformUserHandle,
                kills: lastInMonth.kills,
                deaths: lastInMonth.deaths,
                timePlayedValue: lastInMonth.timePlayedValue,
                timePlayedDisplay: formatHistoryTime(lastInMonth.timePlayedValue),
                kdRatio: kd,
                status: "baseline",
            });
            continue;
        }

        const lastBefore = beforeMonth[beforeMonth.length - 1];
        const kills = lastInMonth.kills - lastBefore.kills;
        const deaths = lastInMonth.deaths - lastBefore.deaths;
        const time = lastInMonth.timePlayedValue - lastBefore.timePlayedValue;
        const kd = deaths > 0 ? Math.round((kills / deaths) * 100) : kills * 100;

        // Catch-up month: the last known scrape before this month is not the immediately
        // preceding calendar month (e.g. player was private in between).
        const expectedPrevMonth = previousCalendarMonth(monthStr);
        const actualPrevMonth = `${lastBefore.scrapedAt.getFullYear()}-${String(lastBefore.scrapedAt.getMonth() + 1).padStart(2, "0")}`;
        const status = actualPrevMonth === expectedPrevMonth ? "ok" : "resumed";

        results.push({
            playerId: player.id,
            user: player.user,
            platformUserHandle: player.platformUserHandle,
            kills,
            deaths,
            timePlayedValue: time,
            timePlayedDisplay: formatHistoryTime(time),
            kdRatio: kd,
            status,
        });
    }

    return [...results].sort((a, b) => {
        const rank: Record<PlayerMonthRow["status"], number> = {
            ok: 0,
            resumed: 0,
            baseline: 1,
            zero: 2,
            private: 3,
            inactive: 3,
            not_found: 3,
            not_tracked: 4,
        };
        if (rank[a.status] !== rank[b.status]) {
            return rank[a.status] - rank[b.status];
        }
        switch (sortBy) {
            case "deaths": return b.deaths - a.deaths;
            case "timePlayed": return b.timePlayedValue - a.timePlayedValue;
            case "kd": return b.kdRatio - a.kdRatio;
            default: return b.kills - a.kills;
        }
    });
}
