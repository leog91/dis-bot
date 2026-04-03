import { Message } from "discord.js";
import { defineCommand } from "..";
import fetch from "node-fetch";

export default defineCommand({
    name: "weather",
    description: "Get current weather for a city",
    type: "TEXT",

    async execute(msg: Message, args: string[]) {
        if (args.length === 0) {
            msg.reply("Usage: weather [city] [country_code]");
            return;
        }

        const city = args[0];
        const countryCode = args[1]?.toUpperCase();
        msg.channel.sendTyping();

        try {
            let geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5`;
            if (countryCode) {
                geoUrl += `&country_codes=${countryCode}`;
            }
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                msg.reply(`City "${city}" not found.`);
                return;
            }

            let result: { latitude: number; longitude: number; name: string; country: string; country_code: string };
            if (countryCode) {
                result = geoData.results.find((r: { country_code: string }) => r.country_code.toUpperCase() === countryCode) ?? geoData.results[0];
            } else {
                const arResult = geoData.results.find((r: { country_code: string }) => r.country_code === "AR");
                result = arResult ?? geoData.results[0];
            }
            const { latitude: lat, longitude: lon, name, country, country_code } = result;

            const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,surface_pressure,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset,weathercode&timezone=auto`
            );
            const weatherData = await weatherRes.json();
            const weather = weatherData.current_weather;
            const hourly = weatherData.hourly;
            const daily = weatherData.daily;

            const temp = weather.temperature;
            const wind = weather.windspeed;
            const code = weather.weathercode;
            const windDir = weather.winddirection;

            const currentHour = weather.time ? new Date(weather.time).getHours() : 0;
            const hourIndex = hourly.time.findIndex((t: string) => t.includes(`T${String(currentHour).padStart(2, "0")}:`));
            const humidity = hourIndex >= 0 ? hourly.relative_humidity_2m[hourIndex] : null;
            const feelsLike = hourIndex >= 0 ? hourly.apparent_temperature[hourIndex] : null;
            const precip = hourIndex >= 0 ? hourly.precipitation[hourIndex] : null;
            const clouds = hourIndex >= 0 ? hourly.cloud_cover[hourIndex] : null;
            const pressure = hourIndex >= 0 ? hourly.surface_pressure[hourIndex] : null;
            const uvCurrent = hourIndex >= 0 ? hourly.uv_index[hourIndex] : null;

            const today = daily.time[0];
            const maxTemp = daily.temperature_2m_max[0];
            const minTemp = daily.temperature_2m_min[0];
            const precipSum = daily.precipitation_sum[0];
            const precipProb = daily.precipitation_probability_max[0];
            const uvMax = daily.uv_index_max[0];
            const sunrise = daily.sunrise[0]?.split("T")[1] || "N/A";
            const sunset = daily.sunset[0]?.split("T")[1] || "N/A";

            const conditions: Record<number, string> = {
                0: "Clear sky",
                1: "Mainly clear",
                2: "Partly cloudy",
                3: "Overcast",
                45: "Foggy",
                48: "Depositing rime fog",
                51: "Light drizzle",
                53: "Moderate drizzle",
                55: "Dense drizzle",
                61: "Slight rain",
                63: "Moderate rain",
                65: "Heavy rain",
                71: "Slight snow",
                73: "Moderate snow",
                75: "Heavy snow",
                77: "Snow grains",
                80: "Slight rain showers",
                81: "Moderate rain showers",
                82: "Violent rain showers",
                85: "Slight snow showers",
                86: "Heavy snow showers",
                95: "Thunderstorm",
                96: "Thunderstorm with hail",
                99: "Thunderstorm with heavy hail"
            };

            const condition = conditions[code] ?? `Code ${code}`;
            const windDirStr = getWindDirection(windDir);

            let response = `**${name}, ${country} ${getFlag(country_code)}**\n`;
            response += `> **${condition}**\n\n`;
            response += `**Temperature:** ${temp}°C (feels like ${feelsLike}°C)\n`;
            response += `**Min / Max:** ${minTemp}°C / ${maxTemp}°C\n`;
            response += `**Humidity:** ${humidity}%\n`;
            response += `**Wind:** ${wind} km/h ${windDirStr}\n`;
            response += `**Cloud Cover:** ${clouds}%\n`;
            response += `**Pressure:** ${pressure?.toFixed(0)} hPa\n`;
            response += `**Precipitation:** ${precip} mm\n`;
            response += `**UV Index:** ${uvCurrent} (max: ${uvMax})\n`;
            response += `**Rain Chance:** ${precipProb}%\n`;
            response += `**Sunrise:** ${sunrise} | **Sunset:** ${sunset}`;

            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            response += `\n\n**7-Day Forecast**\n`;
            response += `\`\`\`\n`;
            for (let i = 0; i < daily.time.length; i++) {
                const date = new Date(daily.time[i]);
                const dayName = dayNames[date.getDay()];
                const d = date.getDate();
                const wCode = daily.weathercode ? daily.weathercode[i] : 0;
                const dayCond = conditions[wCode] ?? "?";
                const dayMax = daily.temperature_2m_max[i];
                const dayMin = daily.temperature_2m_min[i];
                const dayProb = daily.precipitation_probability_max[i] ?? 0;
                response += `${dayName} ${d}  ${dayCond.padEnd(22)} ${String(dayMin).padStart(4)}° / ${String(dayMax).padStart(4)}°   Rain: ${String(dayProb).padStart(3)}%\n`;
            }
            response += `\`\`\``;

            msg.reply(response);
        } catch {
            msg.reply("Failed to fetch weather data.");
        }
    }
});

function getWindDirection(degrees: number): string {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

function getFlag(countryCode: string): string {
    return countryCode
        .toUpperCase()
        .split("")
        .map((c) => String.fromCodePoint(c.charCodeAt(0) - 0x41 + 0x1F1E6))
        .join("");
}
