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
