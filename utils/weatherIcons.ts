export type WeatherIcon = "rain" | "sunrise" | "sunset" | "wind" | "sun" | "temperature" | "cold" | "outdoor" | "clock";

const PATHS: Record<WeatherIcon, string> = {
    rain: '<path d="M6 14a4 4 0 1 1 1-7 5 5 0 0 1 9 1 3 3 0 1 1 1 6H6"/><path d="m8 17-1 3m6-3-1 3m6-3-1 3"/>',
    sunrise: '<path d="M3 17h18M6 14a6 6 0 0 1 12 0M12 2v7m-3-4 3-3 3 3M3 10l2 1m14 0 2-1M7 21h10"/>',
    sunset: '<path d="M3 17h18M6 14a6 6 0 0 1 12 0M12 2v7m-3-3 3 3 3-3M3 10l2 1m14 0 2-1M7 21h10"/>',
    wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    temperature: '<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M12 8v10"/><circle cx="12" cy="18" r="1"/>',
    cold: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4"/>',
    outdoor: '<path d="m3 20 7-14 4 8 2-4 5 10H3Z"/><path d="m7 12 3 2 3-2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'
};

export function renderWeatherIcon(icon: WeatherIcon, x: number, y: number, color = "#7dd3fc", size = 18): string {
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="${icon}">${PATHS[icon]}</svg>`;
}
