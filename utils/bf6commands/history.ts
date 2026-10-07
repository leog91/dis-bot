import {
    getMonthlyHistory,
    getPlayerMonthlyHistory,
    getMonthLeaderboard,
    resolveMonth,
} from "../bf6data";
import { statusMarker } from "./format";
import type { BF6Handler } from "./constants";
import { replyMonthlyHistory } from "./historyReply";

export const historyHandler: BF6Handler = async (_sub, _msg, args, safeReply) => {
    const arg1 = args[1];
    const arg2 = args[2];

    if (!arg1) {
        const months = await getMonthlyHistory();
        if (!months.length) {
            await safeReply("No monthly history data available yet.");
            return;
        }

        await replyMonthlyHistory("BF6 Monthly History", months, safeReply);
        return;
    }

    const resolvedMonth = resolveMonth(arg1);

    if (resolvedMonth) {
        const sortArg = (arg2 ?? "kills").toLowerCase();
        let sortBy: "kills" | "deaths" | "timePlayed" | "kd" = "kills";
        if (sortArg === "deaths") sortBy = "deaths";
        else if (sortArg === "time" || sortArg === "timeplayed" || sortArg === "playtime") sortBy = "timePlayed";
        else if (sortArg === "kd" || sortArg === "k/d") sortBy = "kd";

        const rows = await getMonthLeaderboard(resolvedMonth, sortBy);

        const [y, m] = resolvedMonth.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthName = monthNames[parseInt(m) - 1];
        const sortLabel = sortBy === "timePlayed" ? "time" : sortBy;

        if (!rows.length) {
            await safeReply(`No player data found for ${monthName} ${y}.`);
            return;
        }

        const visibleRows = rows.slice(0, 20);
        const playerColWidth = Math.max(
            "player".length,
            ...visibleRows.map((r) => r.platformUserHandle.length)
        );
        const fmtPlayer = (name: string, status: string) => {
            const marker = statusMarker(status);
            return (name + marker).padEnd(playerColWidth + marker.length, " ");
        };

        const fmtVal = (n: number, status: string) => {
            if (status === "not_tracked" || status === "private" || status === "inactive" || status === "not_found") return "-".padStart(7, " ");
            if (status === "baseline") return ("~" + n).padStart(7, " ");
            return String(n).padStart(7, " ");
        };

        const fmtTime = (display: string, status: string) => {
            if (status === "not_tracked" || status === "private" || status === "inactive" || status === "not_found") return "-".padEnd(9, " ");
            if (status === "baseline") return ("~" + display).padEnd(9, " ").slice(0, 9);
            return display.padEnd(9, " ");
        };

        const fmtKd = (ratio: number, status: string) => {
            if (status === "not_tracked" || status === "private" || status === "inactive" || status === "not_found") return "    -";
            if (status === "baseline") return ("~" + (ratio / 100).toFixed(2)).padStart(5, " ").slice(0, 5);
            return (ratio / 100).toFixed(2).padStart(5, " ");
        };

        const fmtStatus = (status: string) => {
            switch (status) {
                case "baseline": return "baseline";
                case "resumed": return "🔓 resumed";
                case "private": return "🔒 private";
                case "inactive": return "⚠️ inactive";
                case "not_found": return "❓ not found";
                case "not_tracked": return "not tracked";
                default: return "";
            }
        };

        const statusColWidth = Math.max(
            "status".length,
            ...visibleRows.map((r) => fmtStatus(r.status).length)
        );

        const tableRows = visibleRows.map((row, idx) =>
            `${String(idx + 1).padStart(2, " ")} | ${fmtPlayer(row.platformUserHandle, row.status)} | ${fmtTime(row.timePlayedDisplay, row.status)} | ${fmtVal(row.kills, row.status)} | ${fmtVal(row.deaths, row.status)} | ${fmtKd(row.kdRatio, row.status)} | ${fmtStatus(row.status).padEnd(statusColWidth, " ")}`
        );

        const trimmedNote = rows.length > 20
            ? `\n...showing top 20/${rows.length} players`
            : "";

        const privateCount = rows.filter((r) => r.status === "private").length;
        const inactiveCount = rows.filter((r) => r.status === "inactive" || r.status === "not_found").length;
        const notTrackedCount = rows.filter((r) => r.status === "not_tracked").length;
        const resumedCount = rows.filter((r) => r.status === "resumed").length;
        const baselineCount = rows.filter((r) => r.status === "baseline").length;

        const notes: string[] = [];
        if (privateCount > 0) notes.push(`${privateCount} player(s) private`);
        if (inactiveCount > 0) notes.push(`${inactiveCount} player(s) inactive/not found`);
        if (notTrackedCount > 0) notes.push(`${notTrackedCount} player(s) not tracked`);
        if (resumedCount > 0) notes.push(`${resumedCount} player(s) resumed (catch-up stats)`);
        if (baselineCount > 0) notes.push(`${baselineCount} player(s) baseline (first tracked month)`);

        const statusNote = notes.length > 0
            ? `\n*${notes.join(" | ")}*`
            : "";

        await safeReply(
            ` **BF6 History - ${monthName} ${y}** (sorted by ${sortLabel})\n` +
            "```text\n" +
            ` # | ${"player".padEnd(playerColWidth, " ")} | time      |  kills  | deaths |   k/d | ${"status".padEnd(statusColWidth, " ")}\n` +
            tableRows.join("\n") +
            "\n```" +
            trimmedNote +
            statusNote
        );
        return;
    }

    const playerArg = args.slice(1).join(" ").trim();
    const playerHistory = await getPlayerMonthlyHistory(playerArg);
    if (!playerHistory) {
        await safeReply(`No BF6 player found for "${playerArg}".`);
        return;
    }

    if (!playerHistory.months.length) {
        await safeReply(`No monthly history found for ${playerHistory.player.platformUserHandle}.`);
        return;
    }

    await replyMonthlyHistory(`${playerHistory.player.platformUserHandle} - Monthly History`, playerHistory.months, safeReply);
};
