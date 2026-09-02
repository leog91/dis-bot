export function statusMarker(status: string): string {
    switch (status) {
        case "private": return " 🔒";
        case "inactive": return " ⚠️";
        case "not_found": return " ❓";
        default: return "";
    }
}

export function leaderboardStatusMarker(status: string): string {
    // Compact markers used inside leaderboard value lines.
    switch (status) {
        case "private": return "🔒 ";
        case "inactive": return "⚠️ ";
        case "not_found": return "❓ ";
        default: return "";
    }
}

export function formatStatRatio(numerator: number, denominator: number): string {
    if (denominator === 0) return numerator > 0 ? "inf" : "0.00";
    return (numerator / denominator).toFixed(2);
}

export function formatStatPercent(numerator: number | null, denominator: number | null): string {
    if (numerator === null || denominator === null) return "-";
    if (denominator === 0) return "0.00%";
    return `${((numerator / denominator) * 100).toFixed(2)}%`;
}

export function formatStatRate(value: number | null, seconds: number): string {
    if (value === null || seconds <= 0) return "-";
    return ((value / seconds) * 60).toFixed(2);
}
