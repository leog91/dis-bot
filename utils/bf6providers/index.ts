import type { BF6StatsProvider, BF6StatsProviderName } from "./types";

const DEFAULT_PROVIDER: BF6StatsProviderName = "gametools";

function resolveProviderName(): BF6StatsProviderName {
    const raw = (process.env.BF6_STATS_PROVIDER ?? DEFAULT_PROVIDER).toLowerCase();
    if (raw === "tracker" || raw === "gametools") return raw;
    throw new Error(`Unsupported BF6_STATS_PROVIDER: ${raw}`);
}

/**
 * Picks the active BF6 stats provider via BF6_STATS_PROVIDER (default: "gametools").
 * Loaded lazily to avoid initializing provider-specific modules until selected.
 */
export async function getBF6Provider(): Promise<BF6StatsProvider> {
    if (resolveProviderName() === "gametools") {
        const { gametoolsProvider } = await import("./gametools");
        return gametoolsProvider;
    }
    const { trackerProvider } = await import("./tracker");
    return trackerProvider;
}
