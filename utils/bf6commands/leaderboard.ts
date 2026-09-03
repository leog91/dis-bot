import { getBF6Data, getProgressData } from "../bf6data";
import { loadPlayers } from "../bf6rank";
import { buildIntggProfileUrl, leaderboardStatusMarker } from "./format";
import type { BF6Handler } from "./constants";

export const leaderboardHandler: BF6Handler = async (sub, msg, args, safeReply) => {
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
    const prefix = isProgress ? ` **Progress (${timeLabel})**\n` : "";
    const sign = isProgress ? "+" : "";

    switch (sub) {
        case "kills":
            sorted = [...bfdata].sort((a, b) => b.kills - a.kills);
            content = sorted
                .map((p: any) => `${leaderboardStatusMarker(p.status)}${p.platformUserHandle} - ${sign}${p.kills} kills`)
                .join("\n");
            break;

        case "deaths":
            sorted = [...bfdata].sort((a, b) => b.deaths - a.deaths);
            content = sorted
                .map((p) => `${leaderboardStatusMarker(p.status)}${p.platformUserHandle} - ${sign}${p.deaths} deaths`)
                .join("\n");
            break;

        case "revives":
            sorted = [...bfdata].sort((a, b) => b.revives - a.revives);
            content = sorted
                .map((p) => `${leaderboardStatusMarker(p.status)}${p.platformUserHandle} - ${sign}${p.revives} revives`)
                .join("\n");
            break;

        case "score":
            sorted = [...bfdata].sort((a, b) => b.score - a.score);
            content = sorted
                .map((p) => `${leaderboardStatusMarker(p.status)}${p.platformUserHandle} - ${sign}${p.score} score`)
                .join("\n");
            break;

        case "rank":
            if (isProgress) {
                const current = await getBF6Data();
                sorted = [...current].sort((a, b) => (b.careerPlayerRank ?? -1) - (a.careerPlayerRank ?? -1));
            } else {
                sorted = [...bfdata].sort((a, b) => (b.careerPlayerRank ?? -1) - (a.careerPlayerRank ?? -1));
            }
            content = sorted
                .map((p) => `${leaderboardStatusMarker(p.status)}${p.platformUserHandle} - Rank ${p.careerPlayerRank ?? "—"}`)
                .join("\n");
            break;

        case "timePlayed":
            sorted = [...bfdata].sort((a, b) => b.timePlayedValue - a.timePlayedValue);
            content = sorted
                .map((p) => {
                    const marker = leaderboardStatusMarker(p.status);
                    if (isProgress) {
                        const hours = (p.timePlayedValue / 3600).toFixed(1);
                        return `${marker}${p.platformUserHandle} - +${hours}h played`;
                    }
                    return `${marker}${p.platformUserHandle} - ${p.timePlayedDisplay}`;
                })
                .join("\n");
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
