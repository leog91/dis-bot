import type { Database } from "bun:sqlite";
import { and, asc, between, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { alias } from "drizzle-orm/sqlite-core";
import { bf6ClassSnapshots, bf6ItemSnapshots, bf6PlayerAliases, bf6Players, bf6Scrapes, bf6WeaponPlaystyles } from "../db/schema";

const player = {
    id: bf6Players.id,
    name: bf6Players.platformUserHandle,
    status: bf6Players.status,
    profileUrl: bf6Players.profileUrl,
};
const snapshot = {
    kills: bf6Scrapes.kills,
    aiKills: bf6Scrapes.aiKills,
    deaths: bf6Scrapes.deaths,
    revives: bf6Scrapes.revives,
    wins: bf6Scrapes.wins,
    losses: bf6Scrapes.losses,
    matches: bf6Scrapes.matchesPlayed,
    damage: bf6Scrapes.damage,
    shotsFired: bf6Scrapes.shotsFired,
    shotsHit: bf6Scrapes.shotsHit,
    assists: bf6Scrapes.killAssists,
    heals: bf6Scrapes.heals,
    resupplies: bf6Scrapes.resupplies,
    repairs: bf6Scrapes.repairs,
    squadRevives: bf6Scrapes.squadmateRevives,
    spots: bf6Scrapes.enemiesSpotted,
    score: bf6Scrapes.score,
    rank: bf6Scrapes.careerPlayerRank,
    playtime: bf6Scrapes.timePlayedValue,
    source: bf6Scrapes.source,
    date: bf6Scrapes.scrapedAt,
};

export function createStatsReader(client: Database) {
    const db = drizzle(client);
    const candidate = alias(bf6Scrapes, "candidate");
    const latestId = db.select({ id: candidate.id }).from(candidate)
        .where(eq(candidate.playerId, bf6Players.id))
        .orderBy(desc(candidate.scrapedAt), desc(candidate.id))
        .limit(1);
    const latest = () => db.select({ ...player, snapshot }).from(bf6Players)
        .leftJoin(bf6Scrapes, eq(bf6Scrapes.id, sql`(${latestId})`));
    const priorIds = (date: Date) => db.select({ id: candidate.id }).from(candidate)
        .where(and(eq(candidate.playerId, bf6Players.id), lt(candidate.scrapedAt, date)))
        .orderBy(desc(candidate.scrapedAt), desc(candidate.id)).limit(1);
    const reportFields = {
        playerId: bf6Scrapes.playerId, kills: snapshot.kills, deaths: snapshot.deaths,
        revives: snapshot.revives, playtime: snapshot.playtime, source: snapshot.source, date: snapshot.date,
    };
    const baselines = (date: Date) => db.select(reportFields).from(bf6Players)
        .innerJoin(bf6Scrapes, eq(bf6Scrapes.id, sql`(${priorIds(date)})`)).all();
    const reportRows = (from: Date, to: Date, inclusive: boolean) => db.select(reportFields).from(bf6Scrapes)
        .where(and(gte(bf6Scrapes.scrapedAt, from), (inclusive ? lte : lt)(bf6Scrapes.scrapedAt, to)))
        .orderBy(asc(bf6Scrapes.scrapedAt), asc(bf6Scrapes.id)).all();

    const gearTables = {
        weapon: { table: bf6WeaponPlaystyles, key: bf6WeaponPlaystyles.weaponName, name: bf6WeaponPlaystyles.weaponName },
        class: { table: bf6ClassSnapshots, key: bf6ClassSnapshots.classKey, name: bf6ClassSnapshots.className },
        item: { table: bf6ItemSnapshots, key: bf6ItemSnapshots.itemKey, name: bf6ItemSnapshots.itemKey },
    };

    return {
        checkSchema: () => latest().limit(0).all(),
        leaderboard: () => latest().all(),
        player: (id: string) => latest().where(eq(bf6Players.id, id)).get(),
        players: () => db.select(player).from(bf6Players).orderBy(asc(player.name), asc(player.id)).all(),
        playerHistory: (id: string, to: Date) => db.select({
            kills: snapshot.kills, revives: snapshot.revives, playtime: snapshot.playtime,
            source: snapshot.source, date: snapshot.date,
        }).from(bf6Scrapes).where(and(eq(bf6Scrapes.playerId, id), lt(bf6Scrapes.scrapedAt, to)))
            .orderBy(asc(bf6Scrapes.scrapedAt), asc(bf6Scrapes.id)).all(),
        history: (id: string, from: Date, to: Date) => db.select(snapshot).from(bf6Scrapes)
            .where(and(eq(bf6Scrapes.playerId, id), between(bf6Scrapes.scrapedAt, from, to)))
            .orderBy(asc(bf6Scrapes.scrapedAt), asc(bf6Scrapes.id)).all(),
        weapons: (id: string) => db.select().from(bf6WeaponPlaystyles)
            .where(eq(bf6WeaponPlaystyles.playerId, id))
            .orderBy(desc(bf6WeaponPlaystyles.kills), asc(bf6WeaponPlaystyles.weaponName)).all(),
        classes: (id: string) => db.select().from(bf6ClassSnapshots)
            .where(eq(bf6ClassSnapshots.playerId, id))
            .orderBy(desc(bf6ClassSnapshots.timePlayedValue), asc(bf6ClassSnapshots.className)).all(),
        items: (id: string) => db.select().from(bf6ItemSnapshots)
            .where(eq(bf6ItemSnapshots.playerId, id))
            .orderBy(desc(bf6ItemSnapshots.kills), asc(bf6ItemSnapshots.itemKey)).all(),
        aliases: (id: string) => db.select().from(bf6PlayerAliases)
            .where(eq(bf6PlayerAliases.playerId, id)).orderBy(desc(bf6PlayerAliases.lastSeenAt)).all(),
        months: (to: Date) => {
            const month = sql<string>`strftime('%Y-%m', ${bf6Scrapes.scrapedAt}, 'unixepoch')`;
            return db.selectDistinct({ month }).from(bf6Scrapes).where(lte(bf6Scrapes.scrapedAt, to)).orderBy(desc(month)).all()
                .map(row => row.month);
        },
        earliest: (to: Date) => db.select({ date: bf6Scrapes.scrapedAt }).from(bf6Scrapes)
            .where(lte(bf6Scrapes.scrapedAt, to)).orderBy(asc(bf6Scrapes.scrapedAt)).limit(1).get()?.date,
        baselines,
        reportRows,
        gearOptions: (kind: keyof typeof gearTables) => {
            const { table, key, name } = gearTables[kind];
            return db.select({ key, name: sql<string>`min(${name})` }).from(table).groupBy(key).all();
        },
        gearLeaderboard: (kind: keyof typeof gearTables, item: string) => {
            const { table, key } = gearTables[kind];
            return db.select({ ...player, kills: table.kills, time: table.timePlayedValue,
                timeDisplay: table.timePlayedDisplay, date: table.scrapedAt }).from(table)
                .innerJoin(bf6Players, eq(table.playerId, bf6Players.id)).where(eq(key, item))
                .orderBy(desc(table.kills), asc(player.name)).all();
        },
    };
}

export type StatsReader = ReturnType<typeof createStatsReader>;
export type Snapshot = ReturnType<StatsReader["history"]>[number];
export const dayMs = 86_400_000;

const ratio = (numerator: number | null, denominator: number | null) =>
    numerator === null || denominator === null || denominator <= 0 ? null : numerator / denominator;

type Counter = Exclude<keyof Snapshot, "source" | "date">;
const counter = (key: Counter, label: string) => ({
    label, value: (s: Snapshot) => s[key], counters: [key],
});

export const metrics = {
    kills: counter("kills", "Human kills"),
    kd: { label: "K/D", value: (s: Snapshot) => ratio(s.kills, s.deaths), counters: ["kills", "deaths"] },
    revives: counter("revives", "Revives"),
    winRate: {
        label: "Win rate",
        value: (s: Snapshot) => ratio(s.wins, s.wins === null || s.losses === null ? null : s.wins + s.losses),
        counters: ["wins", "losses"],
    },
    playtime: { label: "Playtime", value: (s: Snapshot) => s.playtime / 3600, counters: ["playtime"] },
    rank: counter("rank", "Career rank"),
    aiKills: counter("aiKills", "AI kills"),
    deaths: counter("deaths", "Deaths"),
    wins: counter("wins", "Wins"),
    losses: counter("losses", "Losses"),
    matches: counter("matches", "Matches"),
    score: counter("score", "Score"),
    damage: counter("damage", "Damage"),
    accuracy: {
        label: "Accuracy", value: (s: Snapshot) => ratio(s.shotsHit, s.shotsFired), counters: ["shotsHit", "shotsFired"],
    },
    shotsFired: counter("shotsFired", "Shots fired"),
    shotsHit: counter("shotsHit", "Shots hit"),
    assists: counter("assists", "Kill assists"),
    squadRevives: counter("squadRevives", "Squad revives"),
    heals: counter("heals", "Heals"),
    resupplies: counter("resupplies", "Resupplies"),
    repairs: counter("repairs", "Repairs"),
    spots: counter("spots", "Enemies spotted"),
    totalKills: { label: "Human + AI kills", value: (s: Snapshot) => s.aiKills === null ? null : s.kills + s.aiKills, counters: ["kills", "aiKills"] },
    aiShare: { label: "AI kill share", value: (s: Snapshot) => ratio(s.aiKills, s.aiKills === null ? null : s.kills + s.aiKills), counters: ["kills", "aiKills"] },
    kpm: { label: "Human kills/min", value: (s: Snapshot) => ratio(s.kills, s.playtime / 60), counters: ["kills", "playtime"] },
    dpm: { label: "Damage/min", value: (s: Snapshot) => ratio(s.damage, s.playtime / 60), counters: ["damage", "playtime"] },
} satisfies Record<string, {
    label: string;
    value: (s: Snapshot) => number | null;
    counters: Counter[];
}>;

export type Metric = keyof typeof metrics;
export const leaderboardMetrics = ["kills", "kd", "revives", "winRate", "playtime"] as const satisfies readonly Metric[];
export const metricGroups = [
    { label: "Career", keys: ["rank", "score", "playtime", "matches", "wins", "losses", "winRate"] },
    { label: "Combat", keys: ["kills", "aiKills", "deaths", "kd", "damage", "accuracy", "shotsFired", "shotsHit"] },
    { label: "Teamplay", keys: ["revives", "squadRevives", "assists", "heals", "resupplies", "repairs", "spots"] },
    { label: "Kill split and rates", keys: ["totalKills", "aiShare", "kpm", "dpm"] },
] as const satisfies readonly { label: string; keys: readonly Metric[] }[];

const metricKeys = Object.keys(metrics) as Metric[];
export const parseMetric = (key: string | null, allowed: readonly Metric[] = metricKeys): Metric =>
    allowed.find(metric => metric === key) ?? "kills";

export function formatMetric(metric: Metric, value: number | null, change = false) {
    if (value === null) return "—";
    const sign = change && value > 0 ? "+" : "";
    if (metric === "winRate" || metric === "accuracy" || metric === "aiShare") return `${sign}${(value * 100).toFixed(1)}${change ? " pp" : "%"}`;
    if (metric === "playtime") return `${sign}${value.toFixed(1)} h`;
    if (metric === "kd" || metric === "kpm" || metric === "dpm") return `${sign}${value.toFixed(2)}`;
    return sign + value.toLocaleString("en-US");
}

export function historySeries(rows: Snapshot[], metric: Metric) {
    const { value, counters } = metrics[metric];
    let comparable = true;
    const points = rows.map((row, index) => {
        const previous = rows[index - 1];
        const currentValue = value(row);
        const continuous = !!previous && currentValue !== null && value(previous) !== null
            && previous.source === row.source
            && counters.every(key => previous[key] !== null && row[key] !== null && row[key] >= previous[key]);
        if (previous && !continuous) comparable = false;
        return {
            date: row.date,
            value: currentValue,
            source: row.source,
            connect: continuous && +row.date - +previous.date <= dayMs,
        };
    });
    const first = points[0];
    const last = points.at(-1);
    const change = comparable && first && last && +last.date > +first.date
        ? last.value - first.value : null;
    return { points, change };
}
