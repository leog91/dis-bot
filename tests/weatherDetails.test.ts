import { describe, expect, it } from "bun:test";
import sharp from "sharp";
import { formatLocalTime, formatRainAmount, getWeatherHighlights, renderHourlyForecast, renderWeatherHighlights } from "../utils/weatherDetails";

function forecast() {
    return {
        timezone: "Europe/Dublin",
        current_weather: { time: "2026-10-22T23:15" },
        hourly: {
            time: ["2026-10-22T22:00", "2026-10-22T23:00", ...Array.from({ length: 15 }, (_, hour) => `2026-10-23T${String(hour).padStart(2, "0")}:00`)],
            temperature_2m: Array(17).fill(12.3),
            precipitation: Array(17).fill(0.6),
            precipitation_probability: Array(17).fill(65)
        },
        daily: {
            time: ["2026-10-22", "2026-10-23"],
            temperature_2m_max: [12, 18],
            temperature_2m_min: [5, -2],
            precipitation_sum: [4.2, 0],
            precipitation_probability_max: [90, 10],
            wind_gusts_10m_max: [55, 20],
            uv_index_max: [6, 2],
            sunrise: ["2026-10-22T08:05", "2026-10-23T08:07"],
            sunset: ["2026-10-22T18:15", "2026-10-23T18:13"]
        }
    };
}

describe("weather details", () => {
    it("shows city-local dates and times across midnight, regardless of the host timezone", () => {
        const now = new Date("2026-10-22T00:30:00Z");
        expect(formatLocalTime("Europe/Dublin", now)).toContain("22 Oct");
        expect(formatLocalTime("Europe/Dublin", now)).toContain("01:30");
        expect(formatLocalTime("America/Argentina/Buenos_Aires", now)).toContain("21 Oct");
        expect(formatLocalTime("America/Argentina/Buenos_Aires", now)).toContain("21:30");
        expect(formatLocalTime("Europe/Dublin", new Date("2026-12-22T00:30:00Z"))).toContain("00:30");
        expect(formatLocalTime(undefined, now)).toBe("Local time unavailable");
        expect(formatLocalTime("invalid", now)).toBe("Local time unavailable");
    });

    it("distinguishes zero precipitation from missing data", () => {
        expect(formatRainAmount(0)).toBe("0 mm");
        expect(formatRainAmount(1.26)).toBe("1.3 mm");
        for (const value of [null, undefined, NaN, Infinity]) expect(formatRainAmount(value)).toBe("—");
    });

    it("renders only the current and next eleven hours, including the midnight date change", () => {
        const svg = renderHourlyForecast(forecast(), 250);
        expect(svg).toContain("22 · 23:00");
        expect(svg).toContain("23 · 00:00");
        expect(svg).toContain("23 · 10:00");
        expect(svg).not.toContain("22 · 22:00");
        expect(svg).not.toContain("23 · 11:00");
        expect(svg.match(/12.3°/g)).toHaveLength(12);
        expect(svg).toContain("0.6 mm");
        expect(svg).toContain("65%");
    });

    it("handles short, empty and missing hourly values without invalid SVG numbers", () => {
        const weather = forecast();
        weather.hourly.time = ["2026-10-23T00:00"];
        weather.hourly.temperature_2m = [NaN];
        weather.hourly.precipitation = [];
        weather.hourly.precipitation_probability = [];
        const svg = renderHourlyForecast(weather, 0);
        expect(svg).toContain("—");
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
        weather.hourly.time = [];
        expect(renderHourlyForecast(weather, 0)).toContain("Hourly forecast unavailable");
    });

    it("shows local sunrise/sunset, warnings and date-based forecast highlights", () => {
        const lines = getWeatherHighlights(forecast());
        expect(lines[0]).toContain("Sunrise 08:05 · Sunset 18:15 (local)");
        expect(lines[1]).toContain("55 km/h — strong gusts");
        expect(lines[1]).toContain("6 (high) — sun protection advised");
        expect(lines[2]).toContain("Warmest: Fri 23 (18°)");
        expect(lines[2]).toContain("Coldest: Fri 23 (-2°)");
        expect(lines[2]).toContain("Wettest: Thu 22 (4.2 mm)");
        expect(lines[2]).toContain("Total precipitation (2 days): 4.2 mm");
        expect(lines[3]).toContain("Outdoor pick: Fri 23");
    });

    it("ignores missing lows when selecting the coldest day", () => {
        const weather = forecast();
        weather.daily.temperature_2m_min = [NaN, 0];
        expect(getWeatherHighlights(weather)[2]).toContain("Coldest: Fri 23 (0°)");
        weather.daily.temperature_2m_min = [];
        expect(getWeatherHighlights(weather)[2]).not.toContain("Coldest:");
        expect(renderWeatherHighlights(weather, 373)).not.toMatch(/undefined|NaN/);
    });

    it("sums the full forecast precipitation and rounds only the total", () => {
        const weather = forecast();
        weather.daily.time = Array.from({ length: 10 }, (_, day) => `2026-10-${22 + day}`);
        weather.daily.precipitation_sum = [1.5, 4.3, 3.6, 0.3, 3.6, 0, 0, 2.4, 1.8, 0];
        expect(getWeatherHighlights(weather)[2]).toContain("Total precipitation (10 days): 17.5 mm");
        weather.daily.precipitation_sum = Array(10).fill(0);
        expect(getWeatherHighlights(weather)[2]).toContain("Total precipitation (10 days): 0 mm");
    });

    it("labels incomplete precipitation totals instead of treating missing days as dry", () => {
        const weather = forecast();
        weather.daily.precipitation_sum = [1.2, NaN];
        expect(getWeatherHighlights(weather)[2]).toContain("Precipitation: 1.2 mm (1/2 days available)");
        expect(getWeatherHighlights(weather)[2]).not.toContain("Total precipitation");
        weather.daily.precipitation_sum = [];
        expect(getWeatherHighlights(weather)[2]).not.toContain("Total precipitation");
    });

    it("does not invent highlights or outdoor recommendations for missing data", () => {
        const weather = { current_weather: { time: "2026-10-22T12:00" }, daily: { time: [], temperature_2m_max: [] } };
        const lines = getWeatherHighlights(weather);
        expect(lines[0]).toContain("Sunrise — · Sunset —");
        expect(lines[2]).toBe("Forecast highlights unavailable");
        expect(lines[3]).toBe("Outdoor pick unavailable");
        expect(lines.join(" ")).not.toMatch(/NaN|undefined|Infinity/);
    });

    it("rasterizes hourly details and highlights inside the expanded card", async () => {
        const weather = forecast();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="490">${renderHourlyForecast(weather, 250)}${renderWeatherHighlights(weather, 373)}</svg>`;
        const png = await sharp(Buffer.from(svg)).png().toBuffer();
        expect((await sharp(png).metadata()).height).toBe(490);
    });

    it("renders keyword icons as SVG paths without requiring emoji fonts", () => {
        const highlights = renderWeatherHighlights(forecast(), 373);
        for (const icon of ["rain", "sunrise", "sunset", "wind", "sun", "temperature", "cold", "outdoor"]) {
            expect(highlights).toContain(`aria-label="${icon}"`);
        }
        expect(highlights.match(/aria-label="rain"/g)).toHaveLength(2);
        expect(highlights).toContain("Total precipitation (2 days): 4.2 mm");
        expect(highlights).not.toMatch(/NaN|undefined/);
        expect(renderHourlyForecast(forecast(), 250)).toContain('aria-label="clock"');
    });
});
