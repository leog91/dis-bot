import { renderWeatherIcon, type WeatherIcon } from "./weatherIcons";

interface ComparisonCity {
    location: { name: string; country_code: string };
    weather: {
        daily: {
            time: string[];
            temperature_2m_max: number[];
            temperature_2m_min: number[];
            apparent_temperature_max?: number[];
            precipitation_sum?: number[];
            wind_gusts_10m_max?: number[];
        };
    };
}

const COLORS = ["#60a5fa", "#fb923c", "#4ade80", "#c084fc", "#f472b6"];

export function getWeatherRankings(cities: ComparisonCity[]): Array<{ icon: WeatherIcon; text: string }> {
    if (cities.length < 2) return [];
    const sharedDates = [...new Set(cities[0].weather.daily.time)]
        .filter(date => cities.every(city => city.weather.daily.time.includes(date))).sort();
    type Daily = ComparisonCity["weather"]["daily"];
    const metrics: Array<{ label: string; field: keyof Omit<Daily, "time">; aggregate: "max" | "min" | "sum"; lowest?: boolean; unit: string; icon: WeatherIcon }> = [
        { label: "Hottest peak", field: "temperature_2m_max", aggregate: "max", unit: "°C", icon: "temperature" },
        { label: "Coldest low", field: "temperature_2m_min", aggregate: "min", lowest: true, unit: "°C", icon: "cold" },
        { label: "Most precipitation", field: "precipitation_sum", aggregate: "sum", unit: " mm", icon: "rain" },
        { label: "Least precipitation", field: "precipitation_sum", aggregate: "sum", lowest: true, unit: " mm", icon: "rain" },
        { label: "Strongest gust", field: "wind_gusts_10m_max", aggregate: "max", unit: " km/h", icon: "wind" }
    ];
    return metrics.flatMap(metric => {
        // Each metric uses exactly the same dates for every city, excluding missing values for all.
        const dates = sharedDates.filter(date => cities.every(city => {
            const daily = city.weather.daily;
            const value = daily[metric.field]?.[daily.time.indexOf(date)];
            return typeof value === "number" && Number.isFinite(value);
        }));
        if (!dates.length) return [];
        const scores = cities.map(city => {
            const daily = city.weather.daily;
            const values = dates.map(date => daily[metric.field]![daily.time.indexOf(date)]);
            const raw = metric.aggregate === "sum" ? values.reduce((sum, value) => sum + value, 0)
                : metric.aggregate === "min" ? Math.min(...values) : Math.max(...values);
            return { city, value: Number(raw.toFixed(1)), date: dates[values.indexOf(raw)] };
        });
        const best = (metric.lowest ? Math.min : Math.max)(...scores.map(score => score.value));
        const winners = scores.filter(score => score.value === best);
        const period = `${dates.length} shared ${dates.length === 1 ? "day" : "days"}`;
        // Give tied cities their own rows to keep long names from overflowing the image.
        return winners.map(winner => {
            const date = metric.aggregate === "sum" ? "" : " · " + new Date(`${winner.date}T00:00:00Z`)
                .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });
            return { icon: metric.icon,
                text: `${metric.label}${winners.length > 1 ? " (tied)" : ""}: ${winner.city.location.name}, ${winner.city.location.country_code} — ${best}${metric.unit}${date} (${period})` };
        });
    });
}

function escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
    })[character]!);
}

export function renderWeatherComparison(cities: ComparisonCity[], y: number): { svg: string; height: number } {
    if (cities.length < 2) return { svg: "", height: 0 };

    // Align by local calendar date, not array position (cities may be in different time zones).
    const dates = [...new Set(cities.flatMap(city => city.weather.daily.time))].sort();
    const series = cities.map(city => {
        const daily = city.weather.daily;
        return dates.map(date => {
            const index = daily.time.indexOf(date);
            const high = daily.temperature_2m_max[index];
            const low = daily.temperature_2m_min[index];
            return index >= 0 && Number.isFinite(high) && Number.isFinite(low) ? { high, low } : null;
        });
    });
    const temperatures = series.flatMap(points => points.flatMap(point => point ? [point.low, point.high] : []));
    if (temperatures.length === 0) return { svg: "", height: 0 };

    const legendRows = Math.ceil(cities.length / 2);
    const top = y + 112 + legendRows * 28;
    const plotHeight = 220;
    const bottom = top + plotHeight;
    const left = 100;
    const plotWidth = 900;
    const floor = Math.floor((Math.min(...temperatures) - 1) / 5) * 5;
    const ceiling = Math.ceil((Math.max(...temperatures) + 1) / 5) * 5;
    const scaleX = (index: number) => left + index * plotWidth / Math.max(1, dates.length - 1);
    const scaleY = (temperature: number) => top + (ceiling - temperature) / (ceiling - floor) * plotHeight;
    const text = (x: number, textY: number, value: string, color = "#94a3b8", size = 14, anchor = "start") =>
        `<text x="${x}" y="${textY}" fill="${color}" font-family="sans-serif" font-size="${size}" text-anchor="${anchor}">${escapeXml(value)}</text>`;

    const grid = Array.from({ length: 6 }, (_, index) => {
        const temperature = floor + (ceiling - floor) * index / 5;
        const gridY = scaleY(temperature);
        return `<line x1="${left}" x2="${left + plotWidth}" y1="${gridY}" y2="${gridY}" stroke="#334155"/>`
            + text(left - 12, gridY + 5, `${Number(temperature.toFixed(1))}°`, "#94a3b8", 13, "end");
    }).join("");
    const labels = dates.map((date, index) => {
        const value = new Date(`${date}T00:00:00Z`);
        const label = value.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });
        return text(scaleX(index), bottom + 26, label, "#94a3b8", 12, "middle");
    }).join("");

    const lines = series.map((points, cityIndex) => {
        const color = COLORS[cityIndex % COLORS.length];
        // Break lines at missing data rather than implying a continuous forecast.
        const segments: Array<Array<{ high: number; low: number; index: number }>> = [];
        points.forEach((point, index) => {
            if (!point) return;
            if (index === 0 || !points[index - 1]) segments.push([]);
            segments[segments.length - 1].push({ ...point, index });
        });
        return segments.map(segment => {
            const highs = segment.map(point => `${scaleX(point.index)},${scaleY(point.high)}`).join(" ");
            const lows = segment.map(point => `${scaleX(point.index)},${scaleY(point.low)}`).join(" ");
            const reversedLows = [...segment].reverse().map(point => `${scaleX(point.index)},${scaleY(point.low)}`).join(" ");
            return `<polygon points="${highs} ${reversedLows}" fill="${color}" fill-opacity="0.08"/>
                <polyline points="${highs}" fill="none" stroke="${color}" stroke-width="3"/>
                <polyline points="${lows}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="7 5"/>`
                + segment.map(point => `<circle cx="${scaleX(point.index)}" cy="${scaleY(point.high)}" r="3" fill="${color}"/>
                    <circle cx="${scaleX(point.index)}" cy="${scaleY(point.low)}" r="3" fill="${color}"/>`).join("");
        }).join("");
    }).join("");
    const legend = cities.map((city, index) => {
        const x = 60 + (index % 2) * 490;
        const legendY = y + 108 + Math.floor(index / 2) * 28;
        const color = COLORS[index % COLORS.length];
        return `<line x1="${x}" x2="${x + 28}" y1="${legendY - 5}" y2="${legendY - 5}" stroke="${color}" stroke-width="3"/>`
            + text(x + 38, legendY, `${city.location.name}, ${city.location.country_code}`, color, 16);
    }).join("");
    const summaries = cities.slice(1).map((city, index) => {
        const differences = series[index + 1].flatMap((point, day) =>
            point && series[0][day] ? [point.high - series[0][day]!.high] : []);
        if (!differences.length) return "No overlapping forecast dates for " + city.location.name + ".";
        const difference = differences.reduce((sum, value) => sum + value, 0) / differences.length;
        const rounded = Math.abs(difference).toFixed(1);
        const period = `${differences.length} shared ${differences.length === 1 ? "day" : "days"}`;
        return Number(rounded) === 0
            ? `${city.location.name} and ${cities[0].location.name}: same average daily high (${period}).`
            : `${city.location.name} averages ${rounded}°C ${difference > 0 ? "warmer" : "cooler"} than ${cities[0].location.name} by daily high (${period}).`;
    });
    const feelsLikeSummaries = cities.slice(1).flatMap(city => {
        const base = cities[0].weather.daily;
        const daily = city.weather.daily;
        const differences = daily.time.flatMap((date, index) => {
            const other = daily.apparent_temperature_max?.[index];
            const reference = base.apparent_temperature_max?.[base.time.indexOf(date)];
            return typeof other === "number" && Number.isFinite(other) && typeof reference === "number" && Number.isFinite(reference)
                ? [other - reference] : [];
        });
        if (!differences.length) return [];
        const difference = differences.reduce((sum, value) => sum + value, 0) / differences.length;
        const rounded = Math.abs(difference).toFixed(1);
        const period = `${differences.length} shared ${differences.length === 1 ? "day" : "days"}`;
        return [Number(rounded) === 0
            ? `${city.location.name} and ${cities[0].location.name}: same average feels-like high (${period}).`
            : `${city.location.name} feels ${rounded}°C ${difference > 0 ? "warmer" : "cooler"} than ${cities[0].location.name} by daily feels-like high (${period}).`];
    });
    const allSummaries = [...summaries, ...feelsLikeSummaries];
    const rankings = getWeatherRankings(cities);
    const rankingsTop = bottom + 60 + allSummaries.length * 24;
    const rankingHeight = rankings.length ? 34 + rankings.length * 24 : 0;
    const height = bottom - y + 66 + allSummaries.length * 24 + rankingHeight;
    return {
        height: height + 24,
        svg: `<rect x="30" y="${y}" width="1020" height="${height}" rx="18" fill="#17243a" stroke="#263a57"/>
            ${text(58, y + 38, "Temperature comparison · °C", "#f8fafc", 23)}
            ${text(58, y + 68, "Solid = daily maximum · Dashed = daily minimum · Shading = temperature range")}
            ${legend}${grid}${labels}${lines}
            ${allSummaries.map((summary, index) => text(58, bottom + 60 + index * 24, summary, "#cbd5e1")).join("")}
            ${rankings.length ? text(58, rankingsTop + 8, "Forecast standouts · matching dates only", "#f8fafc", 16) : ""}
            ${rankings.map((ranking, index) => {
                const baseline = rankingsTop + 36 + index * 24;
                return renderWeatherIcon(ranking.icon, 58, baseline - 14)
                    + text(82, baseline, ranking.text, "#cbd5e1", 13);
            }).join("")}`
    };
}
