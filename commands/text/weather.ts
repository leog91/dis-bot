import { Message } from "discord.js";
import { defineCommand } from "..";
import fetch from "node-fetch";

interface GeoResult {
    latitude: number;
    longitude: number;
    name: string;
    country: string;
    country_code: string;
}

interface GeoResponse {
    results?: GeoResult[];
}

interface WeatherResponse {
    current_weather: {
        temperature: number;
        windspeed: number;
        winddirection: number;
        weathercode: number;
        time: string;
    };
    hourly: {
        time: string[];
        relative_humidity_2m: number[];
        apparent_temperature: number[];
        precipitation: number[];
        cloud_cover: number[];
        surface_pressure: number[];
        uv_index: number[];
    };
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
        uv_index_max: number[];
        weathercode: number[];
    };
}

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

interface CityWeather {
    location: GeoResult;
    weather: WeatherResponse;
}

const MAX_CITIES = 5;
const geocodingCache = new Map<string, CacheEntry<GeoResult | null>>();
const forecastCache = new Map<string, CacheEntry<WeatherResponse>>();

export default defineCommand({
    name: "weather",
    description: "Compare weather for comma-separated cities",
    type: "TEXT",

    async execute(msg: Message, args: string[]) {
        const cities = parseCities(args);
        if (cities.length === 0) {
            await msg.reply("Usage: `weather city, city COUNTRY_CODE, city`");
            return;
        }
        if (cities.length > MAX_CITIES) {
            await msg.reply(`Please compare at most ${MAX_CITIES} cities at once.`);
            return;
        }
        if ("sendTyping" in msg.channel) await msg.channel.sendTyping();

        try {
            const resolved = [] as PromiseSettledResult<GeoResult | null>[];
            for (const city of cities) {
                try {
                    resolved.push({ status: "fulfilled", value: await resolveLocation(city) });
                } catch (reason) {
                    resolved.push({ status: "rejected", reason });
                }
            }
            const locations = resolved.map(result => result.status === "fulfilled" ? result.value : null);
            const missingLocations = locations
                .filter((location): location is GeoResult => location !== null)
                .filter(location => !getCached(forecastCache, forecastKey(location)));

            if (missingLocations.length > 0) {
                const weather = await fetchWeatherBatch(missingLocations);
                missingLocations.forEach((location, index) => {
                    forecastCache.set(forecastKey(location), {
                        value: weather[index],
                        expiresAt: Date.now() + 10 * 60 * 1000
                    });
                });
            }

            const results = locations.map((location, index): CityWeather | { query: string; error: string } => {
                if (!location) {
                    return {
                        query: cities[index],
                        error: resolved[index].status === "rejected" ? "Unavailable" : "Not found"
                    };
                }
                const weather = getCached(forecastCache, forecastKey(location));
                if (!weather) return { query: cities[index], error: "Unavailable" };
                return { location, weather };
            });

            await msg.reply(formatComparison(results));
            await msg.reply(formatExtendedForecast(results));
        } catch {
            await msg.reply("Failed to fetch weather data.");
        }
    }
});

function parseCities(args: string[]): string[] {
    return args.join(" ").split(",").map(city => city.trim()).filter(Boolean);
}

async function resolveLocation(query: string): Promise<GeoResult | null> {
    // Country codes must be uppercase so city names ending in two letters remain intact.
    const match = query.match(/^(.*?)(?:\s+([A-Z]{2}))?$/);
    const city = match?.[1]?.trim() ?? query;
    const countryCode = match?.[2]?.toUpperCase();
    const cacheKey = `${city.toLowerCase()}|${countryCode ?? ""}`;
    const cached = getCached(geocodingCache, cacheKey);
    if (cached !== undefined) return cached;

    let url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10`;
    if (countryCode) url += `&countryCode=${countryCode}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error("Geocoding request failed");
    const data = await response.json() as GeoResponse;
    const location = countryCode
        ? data.results?.find(result => result.country_code.toUpperCase() === countryCode) ?? null
        : data.results?.find(result => result.country_code === "AR") ?? data.results?.[0] ?? null;

    geocodingCache.set(cacheKey, { value: location, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    return location;
}

async function fetchWeatherBatch(locations: GeoResult[]): Promise<WeatherResponse[]> {
    const latitude = locations.map(location => location.latitude).join(",");
    const longitude = locations.map(location => location.longitude).join(",");
    const url = "https://api.open-meteo.com/v1/forecast?"
        + `latitude=${latitude}&longitude=${longitude}&current_weather=true`
        + "&hourly=relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,surface_pressure,uv_index"
        + "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,weathercode"
        + "&forecast_days=10&timezone=auto";
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error("Weather request failed");
    const data = await response.json() as WeatherResponse | WeatherResponse[];
    return Array.isArray(data) ? data : [data];
}

function formatComparison(results: Array<CityWeather | { query: string; error: string }>): string {
    const width = 19;
    const headers = results.map(result => "location" in result
        ? formatLocationHeader(result.location)
        : result.query);
    const values = results.map(result => "location" in result ? weatherValues(result.weather) : [result.error]);
    const rows = [
        ["Condition", ...values.map(value => value[0] ?? "-")],
        ["Temperature", ...values.map(value => value[1] ?? "-")],
        ["Feels like", ...values.map(value => value[2] ?? "-")],
        ["Min / Max", ...values.map(value => value[3] ?? "-")],
        ["Humidity", ...values.map(value => value[4] ?? "-")],
        ["Wind", ...values.map(value => value[5] ?? "-")],
        ["Rain chance", ...values.map(value => value[6] ?? "-")],
        ["UV index", ...values.map(value => value[7] ?? "-")]
    ];

    const line = (cells: string[]) => cells.map(cell => truncate(cell, width).padEnd(width)).join(" | ");
    return `**Weather comparison**\n${formatLocations(results)}\n\`\`\`\n${line(["", ...headers])}\n${"-".repeat((width + 3) * (headers.length + 1) - 3)}\n${rows.map(line).join("\n")}\n\`\`\``;
}

function weatherValues(weather: WeatherResponse): string[] {
    const hourIndex = weather.hourly.time.findIndex(time => time.startsWith(weather.current_weather.time.slice(0, 13)));
    const hourly = <T>(values: T[]) => hourIndex >= 0 ? values[hourIndex] : undefined;
    const current = weather.current_weather;
    return [
        weatherIcon(current.weathercode),
        `${current.temperature} C`,
        `${hourly(weather.hourly.apparent_temperature) ?? "-"} C`,
        `${weather.daily.temperature_2m_min[0]} / ${weather.daily.temperature_2m_max[0]} C`,
        `${hourly(weather.hourly.relative_humidity_2m) ?? "-"}%`,
        `${current.windspeed} km/h ${getWindDirection(current.winddirection)}`,
        `${weather.daily.precipitation_probability_max[0] ?? "-"}%`,
        `${hourly(weather.hourly.uv_index) ?? "-"} (max ${weather.daily.uv_index_max[0] ?? "-"})`
    ];
}

function formatExtendedForecast(results: Array<CityWeather | { query: string; error: string }>): string {
    const dateWidth = 11;
    const cityWidth = 25;
    const headers = results.map(result => "location" in result
        ? formatLocationHeader(result.location)
        : result.query);
    const days = Array.from({ length: 10 }, (_, index) => index);
    const line = (date: string, cells: string[]) => [date.padEnd(dateWidth), ...cells.map(cell => truncate(cell, cityWidth).padEnd(cityWidth))].join(" | ");
    const separator = "-".repeat(dateWidth + (cityWidth + 3) * headers.length);
    const rows = days.map(day => line(formatDate(results, day), results.map(result => {
        if (!("location" in result)) return result.error;
        const daily = result.weather.daily;
        const condition = weatherIcon(daily.weathercode[day]);
        const min = daily.temperature_2m_min[day];
        const max = daily.temperature_2m_max[day];
        const rainChance = daily.precipitation_probability_max[day];
        return `${condition} ${min}/${max} ${rainChance}%`;
    })));

    return `**10-Day Forecast** (condition, low/high C, rain chance)\n${formatLocations(results)}\n\`\`\`\n${line("Date", headers)}\n${separator}\n${rows.join("\n")}\n\`\`\``;
}

function formatDate(results: Array<CityWeather | { query: string; error: string }>, day: number): string {
    const weather = results.find((result): result is CityWeather => "location" in result)?.weather;
    if (!weather?.daily.time[day]) return `Day ${day + 1}`;
    const date = new Date(`${weather.daily.time[day]}T00:00:00`);
    return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]} ${date.getDate()}`;
}

function weatherIcon(code: number): string {
    if (code === 0) return "☀️";
    if (code === 1 || code === 2) return "🌤️";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 55) return "🌦️";
    if (code >= 61 && code <= 65) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 82) return "🌧️";
    if (code >= 85 && code <= 86) return "🌨️";
    if (code === 95) return "⛈️";
    if (code === 96 || code === 99) return "🌩️";
    return "❔";
}

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
        cache.delete(key);
        return undefined;
    }
    return entry.value;
}

async function fetchWithTimeout(url: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

function forecastKey(location: GeoResult): string {
    return `${location.latitude},${location.longitude}`;
}

function formatLocationHeader(location: GeoResult): string {
    return `${location.name}, ${location.country_code}`;
}

function formatLocations(results: Array<CityWeather | { query: string; error: string }>): string {
    const locations = results
        .filter((result): result is CityWeather => "location" in result)
        .map(({ location }) => `${formatLocationHeader(location)} ${getFlag(location.country_code)}`);
    return locations.length > 0 ? `**Locations:** ${locations.join(" | ")}` : "";
}

function getFlag(countryCode: string): string {
    return countryCode
        .toUpperCase()
        .split("")
        .map(character => String.fromCodePoint(character.charCodeAt(0) - 0x41 + 0x1F1E6))
        .join("");
}

function getWindDirection(degrees: number): string {
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(degrees / 45) % 8];
}

function truncate(value: string, width: number): string {
    return value.length > width ? `${value.slice(0, width - 3)}...` : value;
}
