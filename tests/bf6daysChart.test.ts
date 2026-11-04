import { describe, expect, it } from "bun:test";
import sharp from "sharp";
import { aggregateWeekdayActivity } from "../utils/bf6activity";
import { renderWeekdayChart, weekdayChartSvg } from "../utils/bf6commands/daysChart";

function report() {
    const result = aggregateWeekdayActivity([], new Date("2026-10-26T00:00:00Z"), new Date("2026-11-02T00:00:00Z"));
    result.rows[6].seconds = 7200;
    result.rows[6].activePlayerDays = 1;
    result.rows[6].observedPlayerDays = 1;
    return result;
}

describe("BF6 weekday chart", () => {
    it("uses Monday–Sunday order, escapes titles and labels individual frequency", () => {
        const data = report();
        const svg = weekdayChartSvg("Player <&>", 7, data, true);
        expect(svg).toContain("Player &lt;&amp;&gt;");
        expect(svg.indexOf(">Mon<")).toBeLessThan(svg.indexOf(">Sat<"));
        expect(svg.indexOf(">Sat<")).toBeLessThan(svg.indexOf(">Sun<"));
        expect(svg).toContain("100% active");
        expect(svg).toContain('height="260" rx="6" fill="#34d399"');
        expect(data.rows[0].day).toBe("Sunday");
    });

    it("labels group players and renders a PNG", async () => {
        const data = report();
        expect(weekdayChartSvg("Group", 7, data, false)).toContain("1.00 players");
        const image = await renderWeekdayChart("Group", 7, data, false);
        const metadata = await sharp(image).metadata();
        expect(metadata.format).toBe("png");
        expect(metadata.width).toBe(1160);
        expect(metadata.height).toBe(670);
    });

    it("handles zero activity without invalid scales or highlighting a busiest day", () => {
        const data = report();
        data.rows[6].seconds = 0;
        const svg = weekdayChartSvg("Empty", 7, data, true);
        expect(svg).not.toContain("NaN");
        expect(svg).not.toContain("Infinity");
        expect(svg).not.toContain('fill="#34d399"');
        expect(svg).toContain("No coverage");
        expect(svg).toContain("Coverage: 0% of tracked player-time");
    });

    it("keeps records behind the optional flag and renders their own image", async () => {
        const data = aggregateWeekdayActivity([
            { playerId: "a", source: "gametools", scrapedAt: new Date("2026-10-30T00:00:00Z"), timePlayedValue: 0 },
            { playerId: "a", source: "gametools", scrapedAt: new Date("2026-10-30T02:00:00Z"), timePlayedValue: 7200 },
        ], new Date("2026-10-26T00:00:00Z"), new Date("2026-11-02T00:00:00Z"));
        expect(weekdayChartSvg("Group", 7, data, false)).not.toContain("MOST UNIQUE PLAYERS");
        const svg = weekdayChartSvg("Group", 7, data, false, true);
        expect(svg).toContain("MOST HOURS");
        expect(svg).toContain("MOST UNIQUE PLAYERS");
        expect(svg).toContain("DAY · 2026-10-30");
        expect(svg).toContain("WEEK · 2026-10-26 to 2026-11-01");
        expect(svg).toContain("MONTH · 2026-10 *");
        expect(svg).toContain("2.0h · 1 unique player");
        expect(svg).toContain("1/1 intervals accepted (100%)");
        expect(svg).not.toContain("Green = busiest weekday");
        expect(weekdayChartSvg("Group", null, data, false, true)).toContain("All recorded history");
        const ranged = { ...data, start: new Date("2026-01-02T00:00:00Z"), end: new Date("2026-11-04T12:00:00Z") };
        for (const recordsOnly of [false, true]) {
            expect(weekdayChartSvg("Group", null, ranged, false, recordsOnly)).toContain("All recorded history | 2026-01-02 to 2026-11-04 | UTC");
        }
        const image = await renderWeekdayChart("Group", 7, data, false, true);
        expect((await sharp(image).metadata()).height).toBe(595);
    });
});
