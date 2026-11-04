export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY = 86400000;
const MAX_GAP = DAY;

export type ActivitySnapshot = {
    playerId: string;
    timePlayedValue: number;
    scrapedAt: Date;
    source: string;
};

type ActivityPeriod = {
    key: string;
    start: number;
    end: number;
    seconds: number;
    players: Set<string>;
};

function busiestPeriod(periods: ActivityPeriod[], metric: "hours" | "players", from: number, to: number) {
    const value = (period: ActivityPeriod) => metric === "hours" ? period.seconds : period.players.size;
    const sorted = [...periods].sort((a, b) => value(b) - value(a) || a.start - b.start);
    const best = sorted[0];
    if (!best) return null;
    return {
        key: best.key,
        seconds: best.seconds,
        uniquePlayers: best.players.size,
        partial: best.start < from || best.end > to,
        ties: sorted.filter(period => Math.abs(value(period) - value(best)) < 0.000001).length - 1,
    };
}

/** Estimate activity uniformly inside short scrape intervals; never treat lifetime totals as activity. */
export function aggregateWeekdayActivity(snapshots: ActivitySnapshot[], start: Date, end: Date) {
    const rows = WEEKDAYS.map((day, weekday) => ({ day, weekday, seconds: 0, occurrences: 0, activePlayerDays: 0, observedPlayerDays: 0 }));
    const active = new Map<string, Set<string>>();
    const observed = new Map<string, Set<string>>();
    const trackingStarts = new Map<string, number>();
    const previous = new Map<string, ActivitySnapshot>();
    const periods = {
        day: new Map<string, ActivityPeriod>(),
        week: new Map<string, ActivityPeriod>(),
        month: new Map<string, ActivityPeriod>(),
    };
    let uncertainSeconds = 0;
    let skippedIntervals = 0;
    let acceptedIntervals = 0;
    let observedMilliseconds = 0;
    const from = start.getTime();
    const to = end.getTime();
    for (let date = Math.floor(from / DAY) * DAY; date < to; date += DAY) {
        rows[new Date(date).getUTCDay()].occurrences += Math.max(0, Math.min(date + DAY, to) - Math.max(date, from)) / DAY;
    }
    for (const current of [...snapshots].sort((a, b) => a.scrapedAt.getTime() - b.scrapedAt.getTime())) {
        if (!trackingStarts.has(current.playerId) && current.scrapedAt.getTime() <= to) {
            trackingStarts.set(current.playerId, Math.max(from, current.scrapedAt.getTime()));
        }
        const prev = previous.get(current.playerId);
        previous.set(current.playerId, current);
        if (!prev) continue;
        const a = prev.scrapedAt.getTime();
        const b = current.scrapedAt.getTime();
        const left = Math.max(a, from);
        const right = Math.min(b, to);
        if (right <= left || b <= a) continue;
        const delta = current.timePlayedValue - prev.timePlayedValue;
        if (delta < 0 || current.source !== prev.source || delta > (b - a) / 1000) {
            skippedIntervals++;
            continue;
        }
        if (b - a > MAX_GAP) {
            uncertainSeconds += delta * (right - left) / (b - a);
            skippedIntervals++;
            continue;
        }
        acceptedIntervals++;
        observedMilliseconds += right - left;
        // Only dates covered by accepted intervals belong in individual frequency denominators.
        // Unchanged counters are observations too, unlike missing or invalid intervals.
        for (let cursor = left; cursor < right;) {
            const key = new Date(cursor).toISOString().slice(0, 10);
            if (!observed.has(key)) observed.set(key, new Set());
            observed.get(key)!.add(current.playerId);
            cursor = Math.min(right, (Math.floor(cursor / DAY) + 1) * DAY);
        }
        if (!delta) continue;
        for (let cursor = left; cursor < right;) {
            const next = Math.min(right, (Math.floor(cursor / DAY) + 1) * DAY);
            const date = new Date(cursor);
            const seconds = delta * (next - cursor) / (b - a);
            rows[date.getUTCDay()].seconds += seconds;
            const key = date.toISOString().slice(0, 10);
            if (!active.has(key)) active.set(key, new Set());
            active.get(key)!.add(current.playerId);
            const midnight = Math.floor(cursor / DAY) * DAY;
            const monday = midnight - (date.getUTCDay() + 6) % 7 * DAY;
            const monthStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
            const bounds = [
                { kind: "day", key, start: midnight, end: midnight + DAY },
                { kind: "week", key: new Date(monday).toISOString().slice(0, 10), start: monday, end: monday + 7 * DAY },
                { kind: "month", key: key.slice(0, 7), start: monthStart, end: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) },
            ] as const;
            for (const bound of bounds) {
                const map = periods[bound.kind];
                if (!map.has(bound.key)) map.set(bound.key, { ...bound, seconds: 0, players: new Set() });
                const period = map.get(bound.key)!;
                period.seconds += seconds;
                period.players.add(current.playerId);
            }
            cursor = next;
        }
    }
    for (const [date, players] of active) rows[new Date(date).getUTCDay()].activePlayerDays += players.size;
    for (const [date, players] of observed) rows[new Date(date).getUTCDay()].observedPlayerDays += players.size;
    const trackedMilliseconds = [...trackingStarts.values()].reduce((sum, first) => sum + Math.max(0, to - first), 0);
    const intervalCount = acceptedIntervals + skippedIntervals;
    const coverage = {
        acceptedPercent: intervalCount ? acceptedIntervals / intervalCount * 100 : 0,
        observedPercent: trackedMilliseconds ? observedMilliseconds / trackedMilliseconds * 100 : 0,
        observedMilliseconds,
        trackedMilliseconds,
    };
    const records = {
        day: { hours: busiestPeriod([...periods.day.values()], "hours", from, to), players: busiestPeriod([...periods.day.values()], "players", from, to) },
        week: { hours: busiestPeriod([...periods.week.values()], "hours", from, to), players: busiestPeriod([...periods.week.values()], "players", from, to) },
        month: { hours: busiestPeriod([...periods.month.values()], "hours", from, to), players: busiestPeriod([...periods.month.values()], "players", from, to) },
    };
    return { rows, records, coverage, uncertainSeconds, skippedIntervals, acceptedIntervals };
}

export function parseActivityArgs(args: string[]) {
    const all = args.includes("--all") || args.at(-1)?.toLowerCase() === "all";
    const tokens = args.filter(arg => arg !== "--all");
    if (tokens.at(-1)?.toLowerCase() === "all") tokens.pop();
    const period = tokens.at(-1);
    let days: number | null = all ? null : 90;
    if (period && /^\d+d$/i.test(period)) {
        if (all) return null;
        days = Number(tokens.pop()!.slice(0, -1));
        if (days < 1 || days > 3650) return null;
    }
    return { days, player: tokens.join(" ").trim() };
}
