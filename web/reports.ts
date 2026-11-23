import { aggregateWeekdayActivity } from "../utils/bf6activity";
import { dayMs, type StatsReader } from "./bf6";

export function monthlyProgress(stats: StatsReader, month: string, now: Date) {
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(+start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const previousMonth = new Date(+start);
    previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
    const baselines = new Map(stats.baselines(start).map(row => [row.playerId, row]));
    const rows = stats.reportRows(start, end < now ? end : now, now < end);
    const byPlayer = new Map<string, typeof rows>();
    for (const row of rows) {
        if (!byPlayer.has(row.playerId)) byPlayer.set(row.playerId, []);
        byPlayer.get(row.playerId).push(row);
    }
    return stats.leaderboard().map(player => {
        const baseline = baselines.get(player.id);
        const snapshots = byPlayer.get(player.id);
        const latest = snapshots?.at(-1);
        const missing = (note: string) => ({ ...player, kills: null, deaths: null, kd: null, hours: null, note });
        if (!latest) return missing("No snapshot this month");
        if (!baseline) return missing("No prior baseline");
        if (baseline.date < previousMonth) return missing("Gap before month");
        if (snapshots.some((current, i) => {
            const prev = snapshots[i - 1] ?? baseline;
            return current.source !== prev.source || current.kills < prev.kills ||
                current.deaths < prev.deaths || current.playtime < prev.playtime;
        })) return missing("Provider change or counter reset");
        const kills = latest.kills - baseline.kills;
        const deaths = latest.deaths - baseline.deaths;
        return { ...player, kills, deaths, kd: deaths > 0 ? kills / deaths : null,
            hours: (latest.playtime - baseline.playtime) / 3600, note: "Comparable" };
    }).sort((a, b) => (b.kills ?? -1) - (a.kills ?? -1) || a.name.localeCompare(b.name));
}

export function groupActivity(stats: StatsReader, days: number | null, end: Date) {
    const start = days === null ? stats.earliest(end) ?? end : new Date(+end - days * dayMs);
    const rows = [...stats.baselines(start), ...stats.reportRows(start, end, true)];
    return { start, ...aggregateWeekdayActivity(rows.map(row => ({
        playerId: row.playerId, timePlayedValue: row.playtime, scrapedAt: row.date, source: row.source,
    })), start, end) };
}

type CounterRow = { date: Date; source: string };

function observedGain<K extends string>(rows: readonly (CounterRow & Record<K, number>)[], key: K): number | null {
    const first = rows[0];
    const last = rows.at(-1);
    if (!first || !last || +first.date >= +last.date) return null;
    for (let i = 1; i < rows.length; i++) {
        if (rows[i].source !== rows[i - 1].source || rows[i][key] < rows[i - 1][key]) return null;
    }
    return last[key] - first[key];
}

export function recentProgress(stats: StatsReader, days: number, end: Date, ids?: readonly string[], afterSwitch = false) {
    const requestedStart = new Date(+end - days * dayMs);
    const players = stats.players().filter(player => !ids || ids.includes(player.id));
    const inRange = ids ? null : stats.reportRows(requestedStart, end, true);
    const byPlayer = new Map<string, ReturnType<StatsReader["reportRows"]>>();
    for (const row of inRange ?? []) {
        if (!byPlayer.has(row.playerId)) byPlayer.set(row.playerId, []);
        byPlayer.get(row.playerId).push(row);
    }
    const series = players.map(player => {
        const snapshots = inRange ? byPlayer.get(player.id) ?? [] : stats.history(player.id, requestedStart, end);
        let providerSwitch: { date: Date; from: string; to: string } | null = null;
        let lastRunStart = 0;
        for (let i = 1; i < snapshots.length; i++) {
            const previous = snapshots[i - 1];
            const current = snapshots[i];
            if (previous.source !== current.source) {
                providerSwitch = { date: current.date, from: previous.source, to: current.source };
                lastRunStart = i;
            }
        }
        return { player, snapshots, providerSwitch, lastRunStart };
    });
    // Use the same cutoff for both players. The switch snapshot is a baseline,
    // not a gain; earlier rows at the same second can still use the old provider.
    const switchTime = series.reduce((latest, row) => Math.max(latest, +(row.providerSwitch?.date ?? requestedStart)), +requestedStart);
    const clipped = afterSwitch && series.some(row => row.providerSwitch);
    const start = clipped ? new Date(switchTime) : requestedStart;
    const rows = series.map(({ player, snapshots: original, providerSwitch, lastRunStart }) => {
        const snapshots = clipped ? original.slice(lastRunStart).filter(row => row.date >= start) : original;
        const first = snapshots[0]?.date ?? null;
        const last = snapshots.at(-1)?.date ?? null;
        let longestGap = 0;
        for (let i = 1; i < snapshots.length; i++) {
            longestGap = Math.max(longestGap, +snapshots[i].date - +snapshots[i - 1].date);
        }
        const kills = observedGain(snapshots, "kills");
        const deaths = observedGain(snapshots, "deaths");
        const revives = observedGain(snapshots, "revives");
        const playtime = observedGain(snapshots, "playtime");
        return { ...player, first, last, snapshots: snapshots.length, longestGap, providerSwitch, provider: snapshots.at(-1)?.source,
            span: first && last && +end > +start ? (+last - +first) / (+end - +start) : null,
            kills, deaths, revives, kd: kills !== null && deaths > 0 ? kills / deaths : null,
            hours: playtime === null ? null : playtime / 3600 };
    });
    return { start, requestedStart, end, rows, clipped };
}

export function personalBests(stats: StatsReader, id: string, now: Date) {
    const currentMonth = new Date(`${now.toISOString().slice(0, 7)}-01T00:00:00Z`);
    const rows = stats.playerHistory(id, currentMonth);
    const byMonth = new Map<string, typeof rows>();
    for (const row of rows) {
        const month = row.date.toISOString().slice(0, 7);
        if (!byMonth.has(month)) byMonth.set(month, []);
        byMonth.get(month).push(row);
    }
    const records: Record<"kills" | "revives" | "playtime", { month: string; value: number } | null> =
        { kills: null, revives: null, playtime: null };
    const keys = ["kills", "revives", "playtime"] as const;
    for (const [month, snapshots] of byMonth) {
        const previous = new Date(`${month}-01T00:00:00Z`);
        previous.setUTCMonth(previous.getUTCMonth() - 1);
        const baseline = byMonth.get(previous.toISOString().slice(0, 7))?.at(-1);
        if (!baseline) continue;
        const observed = [baseline, ...snapshots];
        for (const key of keys) {
            const value = observedGain(observed, key);
            if (value !== null && value > (records[key]?.value ?? 0)) records[key] = { month, value };
        }
    }
    return records;
}
