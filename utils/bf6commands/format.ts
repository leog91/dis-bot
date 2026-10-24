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

export function buildIntggProfileUrl(handle: string, profileId: string): string {
    return `https://int.gg/bf6/player/${encodeURIComponent(handle)}-${profileId}`;
}

export function formatLeaderboardTable<T extends {
    platformUserHandle: string;
    status: string;
}>(players: readonly T[], title: string, valueLabel: string, formatValue: (player: T) => string): string {
    if (!players.length) return "";
    const visiblePlayers = players.slice(0, 20);
    const playerWidth = Math.max("player".length, ...visiblePlayers.map((p) => (p.platformUserHandle + statusMarker(p.status)).length));
    const values = visiblePlayers.map(formatValue);
    const valueWidth = Math.max(7, valueLabel.length, ...values.map((value) => value.length));
    const rows = visiblePlayers.map((p, index) =>
        `${String(index + 1).padStart(2, " ")} | ${(p.platformUserHandle + statusMarker(p.status)).padEnd(playerWidth, " ")} | ${values[index].padStart(valueWidth, " ")}`
    );
    const trimmedNote = players.length > 20 ? `\n...showing top 20/${players.length} players` : "";
    const privateCount = players.filter((p) => p.status === "private").length;
    const inactiveCount = players.filter((p) => p.status === "inactive" || p.status === "not_found").length;
    const statusNote = privateCount > 0 || inactiveCount > 0
        ? `\n*${privateCount > 0 ? `${privateCount} private ` : ""}${inactiveCount > 0 ? `${inactiveCount} inactive/not found` : ""}*`
        : "";
    return ` **${title}**\n\`\`\`text\n` +
        `#  | ${"player".padEnd(playerWidth, " ")} | ${valueLabel.padStart(valueWidth, " ")}\n` +
        rows.join("\n") + "\n```" + trimmedNote + statusNote;
}

export function formatProgressValue(value: number, isProgress: boolean): string {
    return `${isProgress && value >= 0 ? "+" : ""}${value}`;
}

export function formatKillsLeaderboard(players: readonly {
    platformUserHandle: string;
    status: string;
    kills: number;
}[], isProgress = false): string {
    return formatLeaderboardTable([...players].sort((a, b) => b.kills - a.kills), "Kills", "kills",
        (player) => formatProgressValue(player.kills, isProgress));
}

export function formatFullKillsLeaderboard(players: readonly {
    platformUserHandle: string;
    status: string;
    kills: number;
    aiKills: number | null;
}[]): string {
    const total = (player: typeof players[number]) => player.aiKills == null ? null : player.kills + player.aiKills;
    if (!players.length) return "";
    const visiblePlayers = [...players]
        .sort((a, b) => (total(b) ?? -1) - (total(a) ?? -1) || b.kills - a.kills)
        .slice(0, 20);
    const headers = ["#", "player", "human", "bots", "total", "bot %"];
    const rows = visiblePlayers.map((player, index) => [
        String(index + 1),
        player.platformUserHandle + statusMarker(player.status),
        String(player.kills),
        String(player.aiKills ?? "N/A"),
        String(total(player) ?? "N/A"),
        player.aiKills == null ? "N/A" : formatStatPercent(player.aiKills, total(player)),
    ]);
    const widths = headers.map((header, index) => Math.max(
        index === 0 ? 2 : index === 1 ? 0 : 7,
        header.length,
        ...rows.map((row) => row[index].length)
    ));
    const formatRow = (row: string[]) => row.map((value, index) => index === 1
        ? value.padEnd(widths[index], " ")
        : value.padStart(widths[index], " ")
    ).join(" | ");
    const trimmedNote = players.length > 20 ? `\n...showing top 20/${players.length} players` : "";
    const privateCount = players.filter((player) => player.status === "private").length;
    const inactiveCount = players.filter((player) => player.status === "inactive" || player.status === "not_found").length;
    const statusNote = privateCount > 0 || inactiveCount > 0
        ? `\n*${privateCount > 0 ? `${privateCount} private ` : ""}${inactiveCount > 0 ? `${inactiveCount} inactive/not found` : ""}*`
        : "";
    return " **Kills** (total)\n```text\n" +
        [formatRow(headers), ...rows.map(formatRow)].join("\n") +
        "\n```" + trimmedNote + statusNote;
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
