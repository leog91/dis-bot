import { renderWeatherIcon, type WeatherIcon } from "./weatherIcons";

interface DetailedWeather {
    timezone?: string;
    current_weather: { time: string };
    hourly: {
        time: string[];
        temperature_2m?: number[];
        precipitation: number[];
        precipitation_probability?: number[];
    };
}

interface HighlightWeather {
    current_weather: { time: string };
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        precipitation_probability_max?: number[];
        wind_gusts_10m_max?: number[];
        uv_index_max?: number[];
        sunrise?: string[];
        sunset?: string[];
    };
}

export function getWeatherHighlights(weather: HighlightWeather): string[] {
    const { daily } = weather;
    const today = daily.time.indexOf(weather.current_weather.time.slice(0, 10));
    const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
    const dateLabel = (index: number) => new Date(`${daily.time[index]}T00:00:00Z`)
        .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });
    const clock = (value: string | undefined) => value?.slice(11, 16) || "—";
    const gust = daily.wind_gusts_10m_max?.[today];
    const uv = daily.uv_index_max?.[today];
    const uvRisk = !finite(uv) ? "" : uv >= 11 ? "extreme" : uv >= 8 ? "very high" : uv >= 6 ? "high" : uv >= 3 ? "moderate" : "low";
    const conditions = `Today · Sunrise ${clock(daily.sunrise?.[today])} · Sunset ${clock(daily.sunset?.[today])} (local)`;
    const warnings = `Peak gusts ${finite(gust) ? `${Math.round(gust)} km/h${gust >= 50 ? " — strong gusts" : ""}` : "—"}`
        + ` · Peak UV ${finite(uv) ? `${Number(uv.toFixed(1))} (${uvRisk})${uv >= 3 ? " — sun protection advised" : ""}` : "—"}`;
    const validDays = daily.time.map((_, index) => index);
    const warmest = validDays.filter(index => finite(daily.temperature_2m_max[index]))
        .sort((a, b) => daily.temperature_2m_max[b] - daily.temperature_2m_max[a])[0];
    const coldest = validDays.filter(index => finite(daily.temperature_2m_min?.[index]))
        .sort((a, b) => daily.temperature_2m_min![a] - daily.temperature_2m_min![b])[0];
    const rainiest = validDays.filter(index => finite(daily.precipitation_sum?.[index]))
        .sort((a, b) => daily.precipitation_sum![b] - daily.precipitation_sum![a])[0];
    const outdoorDays = validDays.filter(index => finite(daily.precipitation_probability_max?.[index])
        && finite(daily.wind_gusts_10m_max?.[index]) && finite(daily.uv_index_max?.[index]));
    const score = (index: number) => daily.precipitation_probability_max![index]
        + daily.wind_gusts_10m_max![index] + daily.uv_index_max![index] * 5;
    const outdoor = outdoorDays.sort((a, b) => score(a) - score(b))[0];
    const precipitation = validDays.map(index => daily.precipitation_sum?.[index]).filter(finite);
    const totalPrecipitation = precipitation.reduce((sum, amount) => sum + amount, 0);
    const precipitationSummary = precipitation.length === 0 ? ""
        : precipitation.length === validDays.length
            ? `Total precipitation (${validDays.length} ${validDays.length === 1 ? "day" : "days"}): ${formatRainAmount(totalPrecipitation)}`
            : `Precipitation: ${formatRainAmount(totalPrecipitation)} (${precipitation.length}/${validDays.length} days available)`;
    const highlights = [
        warmest === undefined ? "" : `Warmest: ${dateLabel(warmest)} (${daily.temperature_2m_max[warmest]}°)`,
        coldest === undefined ? "" : `Coldest: ${dateLabel(coldest)} (${daily.temperature_2m_min![coldest]}°)`,
        rainiest === undefined ? "" : `Wettest: ${dateLabel(rainiest)} (${formatRainAmount(daily.precipitation_sum![rainiest])})`,
        precipitationSummary
    ].filter(Boolean).join(" · ");
    return [conditions, warnings, highlights || "Forecast highlights unavailable",
        outdoor === undefined ? "Outdoor pick unavailable" : `Outdoor pick: ${dateLabel(outdoor)} · lowest combined rain chance, gust and UV score`];
}

export function renderWeatherHighlights(weather: HighlightWeather, y: number): string {
    const columns = [[58, 180, 440], [58, 500], [58, 370, 680], [58], [58]];
    const iconFor = (label: string): WeatherIcon | undefined => {
        if (/^(Total precipitation|Precipitation|Wettest)/.test(label)) return "rain";
        if (label.startsWith("Sunrise")) return "sunrise";
        if (label.startsWith("Sunset")) return "sunset";
        if (label.startsWith("Peak gusts")) return "wind";
        if (label.startsWith("Peak UV")) return "sun";
        if (label.startsWith("Warmest")) return "temperature";
        if (label.startsWith("Coldest")) return "cold";
        if (label.startsWith("Outdoor pick:")) return "outdoor";
        return undefined;
    };
    const [conditions, warnings, highlights, outdoor] = getWeatherHighlights(weather);
    const labels = highlights.split(" · ");
    const precipitation = labels.filter(label => /^(Total precipitation|Precipitation)/.test(label));
    const extremes = labels.filter(label => !/^(Total precipitation|Precipitation)/.test(label));
    return [conditions.split(" · "), warnings.split(" · "), extremes, precipitation, [outdoor]].map((labels, row) => {
        // Fixed columns keep icons aligned without depending on emoji fonts or text-width estimates.
        return labels.map((label, column) => {
            const x = columns[row][column];
            const baseline = y + row * 23;
            const icon = iconFor(label);
            const color = row === 1 ? "#fde68a" : "#cbd5e1";
            const escaped = label.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
            return (icon ? renderWeatherIcon(icon, x, baseline - 14, row === 1 ? "#fde68a" : "#7dd3fc") : "")
                + `<text x="${x + (icon ? 24 : 0)}" y="${baseline}" fill="${color}" font-family="sans-serif" font-size="13">${escaped}</text>`;
        }).join("");
    }).join("");
}

export function formatRainAmount(amount: number | null | undefined): string {
    return typeof amount === "number" && Number.isFinite(amount) ? `${Number(amount.toFixed(1))} mm` : "—";
}

export function formatLocalTime(timezone: string | undefined, now = new Date()): string {
    if (!timezone) return "Local time unavailable";
    try {
        return new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone, weekday: "short", day: "numeric", month: "short",
            hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short"
        }).format(now);
    } catch {
        return "Local time unavailable";
    }
}

export function renderHourlyForecast(weather: DetailedWeather, y: number): string {
    const { hourly } = weather;
    const currentHour = weather.current_weather.time.slice(0, 13);
    const start = hourly.time.findIndex(time => time.slice(0, 13) >= currentHour);
    const text = (x: number, textY: number, value: string, color = "#94a3b8", size = 12) =>
        `<text x="${x}" y="${textY}" text-anchor="middle" fill="${color}" font-family="sans-serif" font-size="${size}">${value}</text>`;
    const heading = renderWeatherIcon("clock", 58, y - 14)
        + `<text x="82" y="${y}" fill="#cbd5e1" font-family="sans-serif" font-size="13">NEXT 12 HOURS · local time · temperature / precipitation / rain chance</text>`;
    if (start < 0) return heading + text(540, y + 40, "Hourly forecast unavailable");
    return heading + hourly.time.slice(start, start + 12).map((time, offset) => {
        const index = start + offset;
        const x = 95 + offset * 81;
        const temperature = hourly.temperature_2m?.[index];
        const chance = hourly.precipitation_probability?.[index];
        const day = time.slice(8, 10);
        const label = `${day} · ${time.slice(11, 16)}`;
        return text(x, y + 24, label)
            + text(x, y + 46, typeof temperature === "number" && Number.isFinite(temperature) ? `${Number(temperature.toFixed(1))}°` : "—", "#e2e8f0", 16)
            + text(x, y + 66, formatRainAmount(hourly.precipitation[index]), "#7dd3fc")
            + text(x, y + 84, typeof chance === "number" && Number.isFinite(chance) ? `${chance}%` : "—", "#7dd3fc");
    }).join("");
}
