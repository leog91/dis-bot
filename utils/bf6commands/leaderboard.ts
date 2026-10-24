import { getBF6Data, getProgressData } from "../bf6data";
import { loadPlayers } from "../bf6rank";
import { buildIntggProfileUrl, formatFullKillsLeaderboard, formatKillsLeaderboard, formatLeaderboardTable, formatProgressValue, leaderboardStatusMarker } from "./format";
import type { BF6Handler } from "./constants";

export const leaderboardHandler: BF6Handler = async (sub, msg, args, safeReply) => {
    if (sub === "kills-full") {
        if (args[1]) {
            await safeReply("Usage: bf6 kills-full (current totals only; no history).");
            return;
        }
        const content = formatFullKillsLeaderboard(await getBF6Data());
        await safeReply(content || "No rank data available yet.");
        return;
    }

    // Handle optional time argument (e.g., "7d", "1m")
    const timeArg = args[1];
    let bfdata = [];
    let isProgress = false;
    let timeLabel = "";

    if (timeArg) {
        const progress = await getProgressData(timeArg);
        if (progress) {
            bfdata = progress.data;
            isProgress = true;
            timeLabel = progress.timeframeLabel;
        } else {
            bfdata = await getBF6Data();
        }
    } else {
        bfdata = await getBF6Data();
    }

    let sorted = bfdata;
    let content = "";
    const prefix = isProgress && sub !== "rank" && sub !== "social" ? ` **Progress (${timeLabel})**\n` : "";

    switch (sub) {
        case "kills":
            content = formatKillsLeaderboard(bfdata, isProgress);
            break;

        case "deaths":
        case "revives":
        case "score":
            sorted = [...bfdata].sort((a, b) => b[sub] - a[sub]);
            content = formatLeaderboardTable(sorted, sub.charAt(0).toUpperCase() + sub.slice(1), sub,
                (p) => formatProgressValue(p[sub], isProgress));
            break;

        case "rank":
            if (isProgress) {
                const current = await getBF6Data();
                sorted = [...current].sort((a, b) => (b.careerPlayerRank ?? -1) - (a.careerPlayerRank ?? -1));
            } else {
                sorted = [...bfdata].sort((a, b) => (b.careerPlayerRank ?? -1) - (a.careerPlayerRank ?? -1));
            }
            content = formatLeaderboardTable(sorted, "Rank", "rank", (p) => String(p.careerPlayerRank ?? "—"));
            break;

        case "timePlayed":
            sorted = [...bfdata].sort((a, b) => b.timePlayedValue - a.timePlayedValue);
            content = formatLeaderboardTable(sorted, "Playtime", "time", (p) => {
                    if (isProgress) {
                        const hours = (p.timePlayedValue / 3600).toFixed(1);
                        return `${p.timePlayedValue >= 0 ? "+" : ""}${hours}h`;
                    }
                    return p.timePlayedDisplay;
                });
            break;

        case "social": {
            const current = await getBF6Data();
            const configuredPlayers = new Map((await loadPlayers()).map((player) => [player.id, player]));
            sorted = [...current].sort((a, b) => b.timePlayedValue - a.timePlayedValue);
            content = sorted
                .map((p) => {
                    const intggProfileId = configuredPlayers.get(p.id)?.intggProfileId;
                    const links = [`[Tracker.gg](<${p.profileUrl}>)`];
                    if (intggProfileId) {
                        links.push(`[INT.GG](<${buildIntggProfileUrl(p.platformUserHandle, intggProfileId)}>)`);
                    }
                    return `${leaderboardStatusMarker(p.status)}${p.platformUserHandle} - ${links.join(" | ")}`;
                })
                .join("\n");
            break;
        }

        default:
            await safeReply("Unknown leaderboard subcommand.");
            return;
    }

    if (!content) {
        await safeReply("No rank data available yet.");
        return;
    }

    await safeReply(prefix + content);
};
