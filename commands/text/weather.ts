import { Message } from "discord.js";
import { defineCommand } from "..";
import sharp from "sharp";

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

            const card = await renderWeatherCard(results);
            await msg.reply({
                content: "**Weather forecast**",
                files: [{ attachment: card, name: "weather-forecast.png" }]
            });
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

async function renderWeatherCard(results: Array<CityWeather | { query: string; error: string }>): Promise<Buffer> {
    const width = 1080;
    const cardHeight = 230;
    const height = 120 + results.length * cardHeight;
    const cards = results.map((result, index) => renderCityCard(result, 92 + index * cardHeight)).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs><linearGradient id="background" x2="0" y2="1"><stop stop-color="#10213d"/><stop offset="1" stop-color="#07101f"/></linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#background)"/>
        <text x="42" y="48" fill="#f8fafc" font-family="sans-serif" font-size="30" font-weight="700">10-Day Weather Forecast</text>
        <text x="42" y="75" fill="#94a3b8" font-family="sans-serif" font-size="16">Temperature ranges in Celsius. Rain probability is shown below each day.</text>
        ${cards}
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
}

function renderCityCard(result: CityWeather | { query: string; error: string }, y: number): string {
    if (!("location" in result)) {
        return `<rect x="30" y="${y}" width="1020" height="200" rx="18" fill="#17243a"/>
            <text x="58" y="${y + 82}" fill="#f8fafc" font-family="sans-serif" font-size="24" font-weight="700">${escapeXml(result.query)}</text>
            <text x="58" y="${y + 120}" fill="#fca5a5" font-family="sans-serif" font-size="18">${escapeXml(result.error)}</text>`;
    }

    const { location, weather } = result;
    const daily = weather.daily;
    const currentHour = weather.hourly.time.findIndex(time => time.startsWith(weather.current_weather.time.slice(0, 13)));
    const feelsLike = currentHour >= 0 ? weather.hourly.apparent_temperature[currentHour] : undefined;
    const temperatures = [...daily.temperature_2m_min, ...daily.temperature_2m_max];
    const floor = Math.floor(Math.min(...temperatures) - 2);
    const ceiling = Math.ceil(Math.max(...temperatures) + 2);
    const chartTop = y + 58;
    const chartHeight = 92;
    const chartX = 338;
    const chartWidth = 675;
    const scaleY = (temperature: number) => chartTop + ((ceiling - temperature) / (ceiling - floor || 1)) * chartHeight;
    const points = daily.time.map((date, day) => {
        const x = chartX + day * (chartWidth / 9);
        const highY = scaleY(daily.temperature_2m_max[day]);
        const lowY = scaleY(daily.temperature_2m_min[day]);
        const label = formatDate(date);
        return `<line x1="${x}" y1="${highY}" x2="${x}" y2="${lowY}" stroke="#60a5fa" stroke-width="12" stroke-linecap="round"/>
            <text x="${x}" y="${highY - 10}" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="13">${daily.temperature_2m_max[day]}°</text>
            <text x="${x}" y="${lowY + 24}" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="13">${daily.temperature_2m_min[day]}°</text>
            <text x="${x}" y="${y + 177}" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12">${label}</text>
            <text x="${x}" y="${y + 198}" text-anchor="middle" fill="#7dd3fc" font-family="sans-serif" font-size="12">${daily.precipitation_probability_max[day] ?? 0}% rain</text>`;
    }).join("");

    return `<rect x="30" y="${y}" width="1020" height="200" rx="18" fill="#17243a" stroke="#263a57"/>
        <text x="58" y="${y + 38}" fill="#f8fafc" font-family="sans-serif" font-size="23" font-weight="700">${escapeXml(formatLocationHeader(location))}</text>
        <text x="58" y="${y + 70}" fill="#93c5fd" font-family="sans-serif" font-size="34" font-weight="700">${weather.current_weather.temperature}°</text>
        <text x="58" y="${y + 99}" fill="#cbd5e1" font-family="sans-serif" font-size="15">${escapeXml(weatherLabel(weather.current_weather.weathercode))}</text>
        <text x="58" y="${y + 130}" fill="#94a3b8" font-family="sans-serif" font-size="14">Feels ${feelsLike ?? "-"}°  •  Wind ${weather.current_weather.windspeed} km/h ${getWindDirection(weather.current_weather.winddirection)}</text>
        <text x="58" y="${y + 155}" fill="#94a3b8" font-family="sans-serif" font-size="14">Humidity ${currentHour >= 0 ? weather.hourly.relative_humidity_2m[currentHour] : "-"}%  •  UV ${currentHour >= 0 ? weather.hourly.uv_index[currentHour] : "-"}</text>
        <text x="${chartX}" y="${y + 38}" fill="#94a3b8" font-family="sans-serif" font-size="13">DAILY LOW / HIGH</text>
        ${points}`;
}

function formatDate(date: string): string {
    const value = new Date(`${date}T00:00:00`);
    return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][value.getDay()]} ${value.getDate()}`;
}

function weatherLabel(code: number): string {
    if (code === 0) return "Clear sky";
    if (code === 1 || code === 2) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if (code === 45 || code === 48) return "Fog";
    if (code >= 51 && code <= 57) return "Drizzle";
    if (code >= 61 && code <= 67) return "Rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Rain showers";
    if (code >= 85 && code <= 86) return "Snow showers";
    if (code >= 95) return "Thunderstorm";
    return "Unknown conditions";
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

function getWindDirection(degrees: number): string {
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(degrees / 45) % 8];
}

function escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&apos;"
    })[character] ?? character);
}
