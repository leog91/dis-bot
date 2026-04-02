import { defineCommand } from "..";
import { Message, TextChannel } from "discord.js";
import { guilds, users } from "../../../dis-bot-assets-private/utils/constants";
import {
    BF6ItemLeaderboardKey,
    BF6ItemSortKey,
    getBF6Data,
    getItemLeaderboard,
    getPlayerWeaponPlaystyle,
    getProgressData,
    refreshBF6Data,
    getPlayerClassStats,
    getClassLeaderboard,
    BF6ClassKey,
} from "../../utils/bf6data";

// ================= CONFIG =================
const REFRESH_OWNER_ID = users.leog;
// ==========================================

const SUBCOMMANDS = [
    "kills",
    "deaths",
    "revives",
    "score",
    "rank",
    "timePlayed",
    "playStyle",
    "bans",
    "refresh",
    "trackergg",
    "rpg",
    "c4",
    "mine",
    "claymore",
    "knife",
    "frag",
    "sledgehammer",
    "mbt",
    "ifv",
    "vehicles",
    "helicopter",
    "planes",
    "class",
    "assault",
    "engineer",
    "support",
    "recon",
] as const;

type SubCommand = typeof SUBCOMMANDS[number];
const SUBCOMMANDS_LIST = SUBCOMMANDS.join(", ");

const SUBCOMMAND_ALIASES: Partial<Record<SubCommand, string[]>> = {
    helicopter: ["heli", "chopper"],
    claymore: ["m18", "m18a1"],
    c4: ["c-4", "c4"],
    mine: ["m15"],
    sledgehammer: ["sledge", "hammer"],
    timePlayed: ["time", "playtime", "hours"],
    trackergg: ["tracker", "tg", "nicks", "nick"],
    vehicles: ["vehicle", "veh"],
    assault: ["aslt"],
    engineer: ["eng"],
    support: ["sup"],
    recon: ["rec"],
};

function resolveSubcommand(raw: string | undefined): SubCommand | null {
    const normalized = raw?.trim().toLowerCase();
    if (!normalized) return null;

    const exact = SUBCOMMANDS.find((command) => command.toLowerCase() === normalized);
    if (exact) return exact;

    for (const command of SUBCOMMANDS) {
        const aliases = SUBCOMMAND_ALIASES[command] ?? [];
        if (aliases.some((alias) => alias.toLowerCase() === normalized)) {
            return command;
        }
    }

    return null;
}

const itemSubcommands: Record<string, BF6ItemLeaderboardKey> = {
    rpg: "rpg",
    c4: "c4",
    mine: "m15",
    claymore: "m18a1",
    knife: "knife",
    frag: "frag",
    sledgehammer: "sledgehammer",
    mbt: "mbt",
    ifv: "ifv",
    vehicles: "vehicles",
    helicopter: "helicopter",
    planes: "planes",
};

const itemTitles: Record<BF6ItemLeaderboardKey, string> = {
    rpg: "RPG",
    c4: "C-4 Explosive",
    mines: "Mines",
    m15: "M15 Mine",
    m18a1: "Claymore (M18A1)",
    knife: "Combat Knife",
    frag: "Frag Grenade",
    sledgehammer: "Sledgehammer",
    mbt: "Main Battle Tank (Leo 2A4 + M1A2)",
    ifv: "IFV (Strf + M3A3)",
    vehicles: "All Vehicles",
    helicopter: "Helicopters",
    planes: "Planes",
};

export default defineCommand({
    name: "bf6",
    description: "BF6 stats",
    type: "TEXT",
    async execute(msg: Message, args: string[]) {
        if (!(msg.channel instanceof TextChannel)) {
            await msg.reply("This command can only be used in a text channel.");
            return;
        }

        const rawSub = args[0];
        const sub = resolveSubcommand(rawSub);

        if (!sub) {
            const hasInput = Boolean(rawSub?.trim());
            const msgText = hasInput
                ? `Unknown subcommand. Available: ${SUBCOMMANDS_LIST}`
                : "Te falta el subcommand máquina:\n" + SUBCOMMANDS_LIST;
            await msg.reply(msgText);
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
                    `force refresh completed in ${durationMs.toFixed(0)} ms.  \n https://is.gd/1Cm9Ta`
                );

                //https://x.com/cto_junior/status/2014353665331777728
                return;
            }

            if (sub === "playStyle") {
                const userArg = args.slice(1).join(" ").trim();
                if (!userArg) {
                    await msg.reply("Usage: `bf6 playStyle [user]`");
                    return;
                }

                // Ensure there is a fresh cached snapshot before querying weapon rows.
                await getBF6Data();
                const playstyle = await getPlayerWeaponPlaystyle(userArg);

                if (!playstyle) {
                    await msg.reply(`No BF6 player found for "${userArg}".`);
                    return;
                }

                if (!playstyle.weapons.length) {
                    await msg.reply(`No weapon playstyle data (>=1h) found for ${playstyle.platformUserHandle}.`);
                    return;
                }

                const toPct = (basisPoints: number) => `${(basisPoints / 100).toFixed(1)}%`;
                const fmtWeapon = (name: string) => name.slice(0, 11).padEnd(11, " ");
                const fmtTime = (time: string) => time.slice(0, 7).padEnd(7, " ");
                const rows = playstyle.weapons.slice(0, 20).map((w) =>
                    `${fmtWeapon(w.weaponName)} | ${fmtTime(w.timePlayedDisplay)} | ${String(w.kills).padStart(5, " ")} | ${toPct(w.adsPct).padStart(6, " ")}/${toPct(w.hipfirePct).padEnd(6, " ")} | ${toPct(w.headshotPct).padStart(6, " ")} | ${toPct(w.accuracyPct).padStart(6, " ")}`
                );

                const trimmedNote = playstyle.weapons.length > 20
                    ? `\n...showing top 20/${playstyle.weapons.length} weapons`
                    : "";

                await msg.reply(
                    ` **${playstyle.platformUserHandle}** playStyle \n` +
                    "```text\n" +
                    "weapon      | time    | kills | ads/hip       | hs%    | acc%\n" +
                    rows.join("\n") +
                    "\n```" +
                    trimmedNote
                );
                return;
            }

            const itemSub = itemSubcommands[sub];
            if (itemSub) {
                const requestedSort = (args[1] ?? "kills").toLowerCase();
                const sortBy: BF6ItemSortKey = requestedSort === "timeplayed" ? "timePlayed" : "kills";
                const rows = await getItemLeaderboard(itemSub, sortBy);

                if (!rows.length) {
                    await msg.reply(`No current ${itemTitles[itemSub]} data found yet.`);
                    return;
                }

                const visibleRows = rows.slice(0, 20);
                const valueLabel = sortBy === "timePlayed" ? "time" : "kills";
                const playerColWidth = Math.max(
                    "player".length,
                    ...visibleRows.map((row) => row.platformUserHandle.length)
                );
                const fmtPlayer = (name: string) => name.padEnd(playerColWidth, " ");
                const fmtValue = (kills: number, timePlayedDisplay: string) =>
                    sortBy === "timePlayed"
                        ? timePlayedDisplay.slice(0, 7).padEnd(7, " ")
                        : `${kills}`.padStart(7, " ");

                const tableRows = visibleRows.map((row, idx) =>
                    `${String(idx + 1).padStart(2, " ")} | ${fmtPlayer(row.platformUserHandle)} | ${fmtValue(row.kills, row.timePlayedDisplay)}`
                );

                const trimmedNote = rows.length > 20
                    ? `\n...showing top 20/${rows.length} players`
                    : "";

                await msg.reply(
                    ` **${itemTitles[itemSub]}** (${sortBy})\n` +
                    "```text\n" +
                    `#  | ${"player".padEnd(playerColWidth, " ")} | ${valueLabel.padEnd(7, " ")}\n` +
                    tableRows.join("\n") +
                    "\n```" +
                    trimmedNote
                );
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
            const prefix = isProgress ? ` **Progress (${timeLabel})**\n` : "";
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

                case "class": {
                    const userArg = args.slice(1).join(" ").trim();
                    if (!userArg) {
                        await msg.reply("Usage: `bf6 class [user]`");
                        return;
                    }

                    const playerClasses = await getPlayerClassStats(userArg);
                    if (!playerClasses) {
                        await msg.reply(`No BF6 player found for "${userArg}".`);
                        return;
                    }

                    if (!playerClasses.classes.length) {
                        await msg.reply(`No class data found for ${playerClasses.platformUserHandle}.`);
                        return;
                    }

                    const fmtTime = (time: string) => time.slice(0, 7).padEnd(7, " ");
                    const fmtK = (n: number) => String(n).padStart(5, " ");
                    const fmtKD = (ratio: number) => (ratio / 100).toFixed(2);

                    const rows = playerClasses.classes.map((cls) => {
                        const kd = fmtKD(cls.kdRatio);
                        return `${cls.className.padEnd(8)} | ${fmtTime(cls.timePlayedDisplay)} | ${kd.padStart(5)} | ${fmtK(cls.kills)} | ${fmtK(cls.deaths)} | ${fmtK(cls.assists)} | ${fmtK(cls.revives)} | ${fmtK(cls.deployments)}`;
                    });

                    await msg.reply(
                        ` **${playerClasses.platformUserHandle}** Classes\n` +
                        "```text\n" +
                        "class    | time    | k/d   | kills | deaths|assists|revives| deploys\n" +
                        rows.join("\n") +
                        "\n```"
                    );
                    return;
                }

                case "assault":
                case "engineer":
                case "support":
                case "recon": {
                    const classKeyMap: Record<string, BF6ClassKey> = {
                        assault: "kit_assault",
                        engineer: "kit_engineer",
                        support: "kit_support",
                        recon: "kit_recon",
                    };
                    const classKey = classKeyMap[sub];
                    const sortArg = args[1]?.toLowerCase();
                    let sortBy: "kills" | "timePlayed" | "kd" | "deployments" = "kills";
                    if (sortArg === "time" || sortArg === "timeplayed" || sortArg === "playtime") {
                        sortBy = "timePlayed";
                    } else if (sortArg === "kd" || sortArg === "k/d") {
                        sortBy = "kd";
                    } else if (sortArg === "deployments" || sortArg === "deploys") {
                        sortBy = "deployments";
                    }

                    const classLeaderboard = await getClassLeaderboard(classKey, sortBy);
                    const classDisplayName = sub.charAt(0).toUpperCase() + sub.slice(1);

                    const visibleRows = classLeaderboard.slice(0, 15);
                    const playerColWidth = Math.max(
                        "player".length,
                        ...visibleRows.map((row) => row.platformUserHandle.length)
                    );
                    const fmtPlayer = (name: string) => name.padEnd(playerColWidth, " ");
                    const fmtTime = (time: string) => time.slice(0, 7).padEnd(7, " ");
                    const fmtK = (n: number) => String(n).padStart(5, " ");
                    const fmtKD = (ratio: number) => (ratio / 100).toFixed(2);

                    const tableRows = visibleRows.map((row, idx) => {
                        const kd = fmtKD(row.kdRatio);
                        return `${String(idx + 1).padStart(2, " ")} | ${fmtPlayer(row.platformUserHandle)} | ${fmtTime(row.timePlayedDisplay)} | ${kd.padStart(5)} | ${fmtK(row.kills)} | ${fmtK(row.deaths)} | ${fmtK(row.assists)} | ${fmtK(row.revives)} | ${fmtK(row.deployments)}`;
                    });

                    const trimmedNote = classLeaderboard.length > 15
                        ? `\n...showing top 15/${classLeaderboard.length} players`
                        : "";

                    await msg.reply(
                        ` **${classDisplayName}** Class Leaderboard (${sortBy})\n` +
                        "```text\n" +
                        `#  | ${"player".padEnd(playerColWidth, " ")} | time    | k/d   | kills | deaths|assists|revives| deploys\n` +
                        tableRows.join("\n") +
                        "\n```" +
                        trimmedNote
                    );
                    return;
                }


                default:
                    await msg.reply(`Unknown subcommand. Available: ${SUBCOMMANDS_LIST}`);
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
