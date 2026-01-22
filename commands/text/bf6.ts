import { defineCommand } from "..";
import { Message, TextChannel } from "discord.js";
import { guilds, users } from "../../utils/constants";
import { getBF6Data, getProgressData, refreshBF6Data } from "../../utils/bf6data";

// ================= CONFIG =================
const REFRESH_OWNER_ID = users.leog;
// ==========================================

type SubCommand =
    | "kills"
    | "deaths"
    | "revives"
    | "score"
    | "rank"
    | "timePlayed"
    | "bans"
    | "refresh"
    | "trackergg";

export default defineCommand({
    name: "bf6",
    description: "BF6 stats",
    type: "TEXT",
    permissions: [
        { type: "GUILD", ids: [guilds.Bytes, guilds.plll] }
    ],

    async execute(msg: Message, args: string[]) {
        if (!(msg.channel instanceof TextChannel)) {
            await msg.reply("This command can only be used in a text channel.");
            return;
        }

        const sub = args[0] as SubCommand;

        if (!sub) {
            await msg.reply(
                "Te falta el subcommand máquina:\n" +
                "kills, deaths, revives, score, rank, timePlayed, bans, refresh, trackergg"
            );
            return;
        }

        try {
            // 🔐 RESTRICTED REFRESH
            if (sub === "refresh") {
                if (msg.author.id !== REFRESH_OWNER_ID) {
                    await msg.reply("🚫 5 USD to leog");
                    return;
                }
                const { durationMs } = await refreshBF6Data();
                await msg.reply(
                    `force refresh completed in ${durationMs.toFixed(0)} ms ) \n https://is.gd/1Cm9Ta`
                );

                //https://x.com/cto_junior/status/2014353665331777728
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
                    // Fallback to normal if parsing failed or invalid
                    bfdata = await getBF6Data();
                }
            } else {
                bfdata = await getBF6Data();
            }

            let sorted = bfdata;
            let content = "";
            const prefix = isProgress ? `📈 **Progress (${timeLabel})**\n` : "";
            const sign = isProgress ? "+" : "";

            switch (sub) {
                case "kills":
                    sorted = [...bfdata].sort((a, b) => b.kills - a.kills);
                    content = sorted
                        .map((p: any) => `${p.platformUserHandle} - ${sign}${p.kills} kills`)
                        .join("\n");
                    break;

                case "deaths":
                    sorted = [...bfdata].sort((a, b) => b.deaths - a.deaths);
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - ${sign}${p.deaths} deaths`)
                        .join("\n");
                    break;

                case "revives":
                    sorted = [...bfdata].sort((a, b) => b.revives - a.revives);
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - ${sign}${p.revives} revives`)
                        .join("\n");
                    break;

                case "score":
                    sorted = [...bfdata].sort((a, b) => b.score - a.score);
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - ${sign}${p.score} score`)
                        .join("\n");
                    break;

                case "rank":
                    // Rank doesn't really have a "progress" sum in the same way, but rank change could be shown?
                    // For now, let's just show current rank even in progress mode
                    if (isProgress) {
                        // Fallback: Just show current data for rank, maybe show "rank gain" later?
                        const current = await getBF6Data();
                        sorted = [...current].sort((a, b) => b.careerPlayerRank - a.careerPlayerRank);
                    } else {
                        sorted = [...bfdata].sort((a, b) => b.careerPlayerRank - a.careerPlayerRank);
                    }
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - Rank ${p.careerPlayerRank}`)
                        .join("\n");
                    break;

                case "timePlayed":
                    sorted = [...bfdata].sort(
                        (a, b) => b.timePlayedValue - a.timePlayedValue
                    );
                    content = sorted
                        .map((p) => {
                            if (isProgress) {
                                // Convert seconds to hours
                                const hours = (p.timePlayedValue / 3600).toFixed(1);
                                return `${p.platformUserHandle} - +${hours}h played`;
                            }
                            return `${p.platformUserHandle} - ${p.timePlayedDisplay}`;
                        })
                        .join("\n");
                    break;

                case "trackergg":
                    // Tracker link is static
                    // If progress mode, maybe we still just show links?
                    const current = await getBF6Data();
                    sorted = [...current].sort(
                        (a, b) => b.timePlayedValue - a.timePlayedValue
                    );
                    content = sorted
                        .map((p) => `[${p.platformUserHandle}](${p.profileUrl})`)
                        .join("\n");
                    break;


                case "bans":
                    content = "pablocc74 - 1 ban";
                    break;


                //await msg.channel.send("[Watch video](https://example.com)");


                default:
                    await msg.reply(
                        "Unknown subcommand. Available: kills, deaths, revives, score, rank, timePlayed, bans, refresh"
                    );
                    return;
            }

            if (!content) {
                await msg.reply("No rank data available yet.");
                return;
            }

            await msg.reply(prefix + content);
        } catch (err) {
            console.error(err);
            await msg.reply("⚠️ Could not load BF6 rank data.");
        }
    }
});
