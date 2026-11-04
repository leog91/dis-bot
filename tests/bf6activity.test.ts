import { describe, expect, it } from "bun:test";
import { aggregateWeekdayActivity, parseActivityArgs, type ActivitySnapshot } from "../utils/bf6activity";

const snapshot = (date: string, hours: number, playerId = "a", source = "gametools"): ActivitySnapshot => ({
    scrapedAt: new Date(date), timePlayedValue: hours * 3600, playerId, source,
});
const start = new Date("2026-10-30T00:00:00Z");
const end = new Date("2026-11-06T00:00:00Z");

describe("BF6 weekday activity", () => {
    it("limits individual weekday denominators to observed dates, not dates before tracking", () => {
        const report = aggregateWeekdayActivity([
            snapshot("2026-10-30T00:00:00Z", 100),
            snapshot("2026-10-30T12:00:00Z", 101),
            snapshot("2026-10-31T00:00:00Z", 101),
        ], new Date("2026-10-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z"));
        expect(report.rows[5].observedPlayerDays).toBe(1);
        expect(report.rows[5].activePlayerDays).toBe(1);
        expect(report.rows[5].seconds).toBe(3600);
        expect(report.rows[5].occurrences).toBe(5);
        expect(report.rows[6].observedPlayerDays).toBe(0);
        expect(report.coverage.trackedMilliseconds).toBe(2 * 86400000);
        expect(report.coverage.observedPercent).toBe(50);
        expect(report.coverage.acceptedPercent).toBe(100);
    });

    it("excludes invalid intervals from observed time but includes missing time in coverage", () => {
        const report = aggregateWeekdayActivity([
            snapshot("2026-10-30T00:00:00Z", 100),
            snapshot("2026-10-30T06:00:00Z", 100),
            snapshot("2026-10-30T12:00:00Z", 90),
            snapshot("2026-10-30T18:00:00Z", 90),
        ], start, new Date("2026-10-31T00:00:00Z"));
        expect(report.coverage.observedPercent).toBe(50);
        expect(report.coverage.acceptedPercent).toBeCloseTo(200 / 3);
        expect(report.rows[5].observedPlayerDays).toBe(1);
        expect(report.rows[5].activePlayerDays).toBe(0);
        expect(aggregateWeekdayActivity([], start, end).coverage.observedPercent).toBe(0);
    });

    it("weights group coverage by tracked player-time, not player counts", () => {
        const report = aggregateWeekdayActivity([
            snapshot("2026-10-30T00:00:00Z", 100),
            snapshot("2026-10-31T00:00:00Z", 101),
            snapshot("2026-10-30T12:00:00Z", 10, "b"),
        ], start, new Date("2026-10-31T00:00:00Z"));
        expect(report.coverage.observedPercent).toBeCloseTo(200 / 3);
    });

    it("ranks actual day/week/month separately by hours and unique players", () => {
        const snapshots = [
            ...["a", "b", "c"].flatMap(player => [
                snapshot("2026-10-30T00:00:00Z", 0, player),
                snapshot("2026-10-30T02:00:00Z", 2, player),
            ]),
            snapshot("2026-11-03T00:00:00Z", 2),
            snapshot("2026-11-03T08:00:00Z", 10),
            snapshot("2026-11-04T00:00:00Z", 10),
            snapshot("2026-11-04T01:00:00Z", 11),
        ];
        const { records } = aggregateWeekdayActivity(snapshots, start, end);
        expect(records.day.hours?.key).toBe("2026-11-03");
        expect(records.day.hours?.seconds).toBe(8 * 3600);
        expect(records.day.hours?.uniquePlayers).toBe(1);
        expect(records.day.players?.key).toBe("2026-10-30");
        expect(records.day.players?.uniquePlayers).toBe(3);
        expect(records.week.hours?.key).toBe("2026-11-02");
        expect(records.week.hours?.seconds).toBe(9 * 3600);
        expect(records.week.hours?.uniquePlayers).toBe(1);
        expect(records.week.players?.key).toBe("2026-10-26");
        expect(records.week.players?.uniquePlayers).toBe(3);
        expect(records.month.hours?.key).toBe("2026-11");
        expect(records.month.players?.key).toBe("2026-10");
        expect(records.month.hours?.partial).toBe(true);
    });

    it("shows earliest tied record and handles empty history", () => {
        const { records } = aggregateWeekdayActivity([
            snapshot("2026-10-30T00:00:00Z", 0),
            snapshot("2026-10-30T01:00:00Z", 1),
            snapshot("2026-10-31T00:00:00Z", 1),
            snapshot("2026-10-31T01:00:00Z", 2),
        ], start, end);
        expect(records.day.hours?.key).toBe("2026-10-30");
        expect(records.day.hours?.ties).toBe(1);
        expect(records.day.players?.ties).toBe(1);
        expect(records.day.hours?.partial).toBe(false);
        expect(aggregateWeekdayActivity([], start, end).records.day.hours).toBeNull();
    });

    it("splits midnight intervals, deduplicates player-days and sums player-hours", () => {
        const report = aggregateWeekdayActivity([
            snapshot("2026-10-30T22:00:00Z", 100),
            snapshot("2026-10-31T02:00:00Z", 102),
            snapshot("2026-10-31T04:00:00Z", 103),
            snapshot("2026-10-31T01:00:00Z", 50, "b"),
            snapshot("2026-10-31T03:00:00Z", 52, "b"),
        ], start, end);
        expect(report.rows[5].seconds).toBe(3600);
        expect(report.rows[6].seconds).toBe(14400);
        expect(report.rows[6].activePlayerDays).toBe(2);
        expect(report.rows.every(row => row.occurrences === 1)).toBe(true);
    });

    it("uses a pre-window baseline, clips hours and ignores lifetime totals", () => {
        const report = aggregateWeekdayActivity([
            snapshot("2026-10-29T22:00:00Z", 1000),
            snapshot("2026-10-30T02:00:00Z", 1002),
        ], start, end);
        expect(report.rows[5].seconds).toBe(3600);
        expect(aggregateWeekdayActivity([snapshot("2026-10-30T02:00:00Z", 1002)], start, end).rows[5].seconds).toBe(0);
    });

    it("does not assign long gaps, resets, provider switches or impossible deltas to weekdays", () => {
        const report = aggregateWeekdayActivity([
            snapshot("2026-10-30T00:00:00Z", 100),
            snapshot("2026-11-01T00:00:00Z", 110),
            snapshot("2026-11-01T01:00:00Z", 1),
            snapshot("2026-11-01T02:00:00Z", 2, "a", "tracker"),
            snapshot("2026-11-01T03:00:00Z", 5, "a", "tracker"),
            snapshot("2026-11-01T04:00:00Z", 6, "a", "tracker"),
        ], start, end);
        expect(report.uncertainSeconds).toBe(36000);
        expect(report.skippedIntervals).toBe(4);
        expect(report.rows[0].seconds).toBe(3600);
    });

    it("does not count unchanged snapshots as active players", () => {
        const report = aggregateWeekdayActivity([
            snapshot("2026-10-30T00:00:00Z", 10),
            snapshot("2026-10-30T06:00:00Z", 10),
        ], start, end);
        expect(report.acceptedIntervals).toBe(1);
        expect(report.rows[5].activePlayerDays).toBe(0);
    });

    it("counts partial boundary days proportionally", () => {
        const report = aggregateWeekdayActivity([], new Date("2026-10-30T12:00:00Z"), new Date("2026-10-31T12:00:00Z"));
        expect(report.rows[5].occurrences).toBe(0.5);
        expect(report.rows[6].occurrences).toBe(0.5);
    });

    it("accepts optional player names and trailing day windows", () => {
        expect(parseActivityArgs([])).toEqual({ days: 90, player: "" });
        expect(parseActivityArgs(["30d"])).toEqual({ days: 30, player: "" });
        expect(parseActivityArgs(["Example", "Player", "30d"])).toEqual({ days: 30, player: "Example Player" });
        expect(parseActivityArgs(["0d"])).toBeNull();
        expect(parseActivityArgs(["3651d"])).toBeNull();
        expect(parseActivityArgs(["--all"])).toEqual({ days: null, player: "" });
        expect(parseActivityArgs(["Example", "Player", "--all"])).toEqual({ days: null, player: "Example Player" });
        expect(parseActivityArgs(["all"])).toEqual({ days: null, player: "" });
        expect(parseActivityArgs(["30d", "--all"])).toBeNull();
    });
});
