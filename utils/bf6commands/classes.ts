import { BF6ClassKey, getClassLeaderboard, getPlayerClassStats } from "../bf6data";
import { statusMarker } from "./format";
import type { BF6Handler } from "./constants";

const classKeyMap: Record<string, BF6ClassKey> = {
    assault: "kit_assault",
    engineer: "kit_engineer",
    support: "kit_support",
    recon: "kit_recon",
};

export const classesHandler: BF6Handler = async (sub, _msg, args, safeReply) => {
    if (sub === "class") {
        const userArg = args.slice(1).join(" ").trim();
        if (!userArg) {
            await safeReply("Usage: `bf6 class [user]`");
            return;
        }

        const playerClasses = await getPlayerClassStats(userArg);
        if (!playerClasses) {
            await safeReply(`No BF6 player found for "${userArg}".`);
            return;
        }

        if (!playerClasses.classes.length) {
            await safeReply(`No class data found for ${playerClasses.platformUserHandle}.`);
            return;
        }

        const fmtTime = (time: string) => time.slice(0, 7).padEnd(7, " ");
        const fmtK = (n: number) => String(n).padStart(5, " ");
        const fmtKD = (ratio: number) => (ratio / 100).toFixed(2);

        const rows = playerClasses.classes.map((cls) => {
            const kd = fmtKD(cls.kdRatio);
            return `${cls.className.padEnd(8)} | ${fmtTime(cls.timePlayedDisplay)} | ${kd.padStart(5)} | ${fmtK(cls.kills)} | ${fmtK(cls.deaths)} | ${fmtK(cls.assists)} | ${fmtK(cls.revives)} | ${fmtK(cls.deployments)}`;
        });

        await safeReply(
            ` **${playerClasses.platformUserHandle}** Classes\n` +
            "```text\n" +
            "class    | time    | k/d   | kills | deaths|assists|revives| deploys\n" +
            rows.join("\n") +
            "\n```"
        );
        return;
    }

    const classKey = classKeyMap[sub];
    if (!classKey) {
        await safeReply("Unknown class subcommand.");
        return;
    }

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
        ...visibleRows.map((row) => row.platformUserHandle.length + (row.status !== "active" ? 2 : 0))
    );
    const fmtPlayer = (name: string, status: string) => (name + statusMarker(status)).padEnd(playerColWidth, " ");
    const fmtTime = (time: string) => time.slice(0, 7).padEnd(7, " ");
    const fmtK = (n: number) => String(n).padStart(5, " ");
    const fmtKD = (ratio: number) => (ratio / 100).toFixed(2).padStart(5, " ");

    const tableRows = visibleRows.map((row, idx) => {
        const kd = fmtKD(row.kdRatio);
        return `${String(idx + 1).padStart(2, " ")} | ${fmtPlayer(row.platformUserHandle, row.status)} | ${fmtTime(row.timePlayedDisplay)} | ${kd} | ${fmtK(row.kills)} | ${fmtK(row.deaths)} | ${fmtK(row.assists)} | ${fmtK(row.revives)} | ${fmtK(row.deployments)}`;
    });

    const trimmedNote = classLeaderboard.length > 15
        ? `\n...showing top 15/${classLeaderboard.length} players`
        : "";

    const privateCount = classLeaderboard.filter((r) => r.status === "private").length;
    const inactiveCount = classLeaderboard.filter((r) => r.status === "inactive" || r.status === "not_found").length;
    const statusNote = (privateCount > 0 || inactiveCount > 0)
        ? `\n*${privateCount > 0 ? `${privateCount} private ` : ""}${inactiveCount > 0 ? `${inactiveCount} inactive/not found` : ""}*`
        : "";

    await safeReply(
        ` **${classDisplayName}** Class Leaderboard (${sortBy})\n` +
        "```text\n" +
        `#  | ${"player".padEnd(playerColWidth, " ")} | time    | k/d   | kills | deaths|assists|revives| deploys\n` +
        tableRows.join("\n") +
        "\n```" +
        trimmedNote +
        statusNote
    );
};
