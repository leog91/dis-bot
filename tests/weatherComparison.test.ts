import { describe, expect, it } from "bun:test";
import sharp from "sharp";
import { getWeatherRankings, renderWeatherComparison } from "../utils/weatherComparison";

function city(name: string, highs = [12, 14], lows = [5, 6], dates = ["2026-10-17", "2026-10-18"]) {
    return {
        location: { name, country_code: name === "Dublin" ? "IE" : "DE" },
        weather: { daily: { time: dates, temperature_2m_max: highs, temperature_2m_min: lows } }
    };
}

describe("weather comparison", () => {
    it("only renders for multiple cities", () => {
        expect(renderWeatherComparison([], 0)).toEqual({ svg: "", height: 0 });
        expect(renderWeatherComparison([city("Dublin")], 0)).toEqual({ svg: "", height: 0 });
    });

    it("renders colored highs, dashed lows, shaded ranges and a daytime comparison", () => {
        const { svg, height } = renderWeatherComparison([city("Dublin"), city("Stuttgart", [16, 18])], 0);
        expect(height).toBeGreaterThan(400);
        expect(svg.match(/<polyline/g)).toHaveLength(4);
        expect(svg.match(/stroke-dasharray="7 5"/g)).toHaveLength(2);
        expect(svg.match(/<polygon/g)).toHaveLength(2);
        expect(svg).toContain('stroke="#60a5fa"');
        expect(svg).toContain('stroke="#fb923c"');
        expect(svg).toContain("Stuttgart averages 4.0°C warmer than Dublin by daily high (2 shared days).");
        expect(svg).toContain("Sat 17");
        expect(svg).toContain("Sun 18");
    });

    it("compares only matching dates rather than array positions", () => {
        const { svg } = renderWeatherComparison([
            city("Dublin"),
            city("Stuttgart", [18, 30], [4, 5], ["2026-10-18", "2026-10-19"])
        ], 0);
        expect(svg).toContain("4.0°C warmer than Dublin by daily high (1 shared day)");
    });

    it("handles cooler and equal averages", () => {
        expect(renderWeatherComparison([city("Dublin"), city("Stuttgart", [10, 12])], 0).svg)
            .toContain("2.0°C cooler");
        expect(renderWeatherComparison([city("Dublin"), city("Stuttgart")], 0).svg)
            .toContain("same average daily high");
    });

    it("compares feels-like highs only on shared dates with available values", () => {
        const dublin = { ...city("Dublin"), weather: { daily: {
            ...city("Dublin").weather.daily, apparent_temperature_max: [8, 10]
        } } };
        const stuttgart = { ...city("Stuttgart"), weather: { daily: {
            ...city("Stuttgart", [16, 18], [5, 6], ["2026-10-18", "2026-10-19"]).weather.daily,
            apparent_temperature_max: [14, 30]
        } } };
        const comparison = renderWeatherComparison([dublin, stuttgart], 0);
        expect(comparison.svg).toContain("Stuttgart feels 4.0°C warmer than Dublin by daily feels-like high (1 shared day).");
        const withoutFeelsLike = [dublin, stuttgart].map(value => ({ ...value, weather: { daily: {
            ...value.weather.daily, apparent_temperature_max: undefined
        } } }));
        expect(comparison.height).toBe(renderWeatherComparison(withoutFeelsLike, 0).height + 24);
        stuttgart.weather.daily.apparent_temperature_max = [NaN, 30];
        expect(renderWeatherComparison([dublin, stuttgart], 0).svg).not.toContain("daily feels-like high");
    });

    it("handles missing values without connecting across gaps", () => {
        const dates = ["2026-10-17", "2026-10-18", "2026-10-19"];
        const { svg } = renderWeatherComparison([
            city("Dublin", [10, NaN, 12], [2, 3, 4], dates),
            city("Stuttgart", [12, 13, 14], [3, 4, 5], dates)
        ], 0);
        expect(svg.match(/<polyline/g)).toHaveLength(6);
        expect(svg).not.toContain("NaN");
        expect(svg).not.toContain("Infinity");
        expect(svg).toContain("2 shared days");
    });

    it("handles empty and non-overlapping forecasts", () => {
        expect(renderWeatherComparison([city("Dublin", [], [], []), city("Stuttgart", [], [], [])], 0).height).toBe(0);
        expect(renderWeatherComparison([
            city("Dublin"), city("Stuttgart", [15], [5], ["2026-10-20"])
        ], 0).svg).toContain("No overlapping forecast dates");
    });

    it("escapes city names in legends and summaries", () => {
        const { svg } = renderWeatherComparison([city("Dublin"), city('<City & "name">')], 0);
        expect(svg).not.toContain('<City & "name">');
        expect(svg).toContain("&lt;City &amp; &quot;name&quot;&gt;");
    });

    it("rasterizes all five cities, including flat and subzero temperatures", async () => {
        const { svg, height } = renderWeatherComparison([
            city("Dublin", [-5, -5], [-5, -5]), city("Stuttgart"),
            city("Berlin"), city("Paris"), city("Rome")
        ], 0);
        expect(svg.match(/<polyline/g)).toHaveLength(10);
        const png = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}">${svg}</svg>`)).png().toBuffer();
        const metadata = await sharp(png).metadata();
        expect(metadata.width).toBe(1080);
        expect(metadata.height).toBe(height);
    });
});

describe("weather standouts", () => {
    function detailedCity(name: string, highs: number[], lows: number[], rain: number[], gusts: number[], dates?: string[]) {
        const value = city(name, highs, lows, dates);
        return { ...value, weather: { daily: { ...value.weather.daily, precipitation_sum: rain, wind_gusts_10m_max: gusts } } };
    }

    it("identifies hottest, coldest, wettest, driest and windiest cities", () => {
        const rankings = getWeatherRankings([
            detailedCity("Dublin", [12, 14], [-2, 6], [4, 6], [50, 30]),
            detailedCity("Stuttgart", [18, 20], [4, 5], [1, 2], [20, 40])
        ]).map(value => value.text);
        expect(rankings).toHaveLength(5);
        expect(rankings[0]).toContain("Hottest peak: Stuttgart, DE — 20°C · Sun 18 (2 shared days)");
        expect(rankings[1]).toContain("Coldest low: Dublin, IE — -2°C · Sat 17");
        expect(rankings[2]).toContain("Most precipitation: Dublin, IE — 10 mm");
        expect(rankings[3]).toContain("Least precipitation: Stuttgart, DE — 3 mm");
        expect(rankings[4]).toContain("Strongest gust: Dublin, IE — 50 km/h");
    });

    it("excludes unmatched dates and removes missing days for every city per metric", () => {
        const cities = [
            detailedCity("Dublin", [99, 14], [-20, 6], [100, 3], [100, 30]),
            detailedCity("Stuttgart", [18, 20], [4, 5], [2, 100], [40, 100], ["2026-10-18", "2026-10-19"])
        ];
        const rankings = getWeatherRankings(cities).map(value => value.text).join("\n");
        expect(rankings).toContain("Hottest peak: Stuttgart, DE — 18°C");
        expect(rankings).toContain("Most precipitation: Dublin, IE — 3 mm (1 shared day)");
        expect(rankings).not.toContain("99°C");
        cities[0].weather.daily.precipitation_sum = [100, NaN];
        expect(getWeatherRankings(cities).map(value => value.text).join(" ")).not.toContain("precipitation:");
    });

    it("labels ties, including dry forecasts, instead of choosing an arbitrary winner", () => {
        const rankings = getWeatherRankings([
            detailedCity("Dublin", [12, 14], [5, 6], [0, 0], [20, 30]),
            detailedCity("Stuttgart", [12, 14], [5, 6], [0, 0], [20, 30])
        ]);
        expect(rankings).toHaveLength(10);
        expect(rankings.every(value => value.text.includes("(tied)"))).toBe(true);
        expect(rankings.filter(value => value.text.startsWith("Most precipitation"))).toHaveLength(2);
        expect(rankings.map(value => value.text).join(" ")).toContain("0 mm");
    });

    it("omits unsupported metrics and does not rank non-overlapping or single-city forecasts", () => {
        expect(getWeatherRankings([city("Dublin")])).toEqual([]);
        expect(getWeatherRankings([city("Dublin"), city("Stuttgart", [10], [5], ["2026-11-01"])])).toEqual([]);
        const rankings = getWeatherRankings([city("Dublin"), city("Stuttgart")]);
        expect(rankings.every(value => !value.text.includes("precipitation") && !value.text.includes("gust"))).toBe(true);
    });

    it("escapes city names and rasterizes all five metric comparisons", async () => {
        const { svg, height } = renderWeatherComparison([
            detailedCity("Dublin", [12, 14], [-2, 6], [4, 6], [50, 30]),
            detailedCity('<City & "name">', [18, 20], [4, 5], [1, 2], [20, 40])
        ], 0);
        expect(svg).toContain("Forecast standouts");
        expect(svg).toContain('aria-label="cold"');
        expect(svg).not.toContain('<City & "name">');
        const png = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}">${svg}</svg>`)).png().toBuffer();
        expect((await sharp(png).metadata()).height).toBe(height);
    });
});
