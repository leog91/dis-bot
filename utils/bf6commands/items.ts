import { BF6ItemSortKey, getItemLeaderboard } from "../bf6data";
import { itemSubcommands, itemTitles } from "./constants";
import { statusMarker } from "./format";
import type { BF6Handler } from "./constants";

export const itemsHandler: BF6Handler = async (sub, _msg, args, safeReply) => {
    const itemSub = itemSubcommands[sub];
    if (!itemSub) {
        await safeReply("Unknown item/vehicle subcommand.");
        return;
    }

    const requestedSort = (args[1] ?? "kills").toLowerCase();
    const sortBy: BF6ItemSortKey = requestedSort === "timeplayed" ? "timePlayed" : "kills";
    const rows = await getItemLeaderboard(itemSub, sortBy);

    if (!rows.length) {
        await safeReply(`No current ${itemTitles[itemSub]} data found yet.`);
        return;
    }

    const visibleRows = rows.slice(0, 20);
    const valueLabel = sortBy === "timePlayed" ? "time" : "kills";
    const playerColWidth = Math.max(
        "player".length,
        ...visibleRows.map((row) => row.platformUserHandle.length + (row.status !== "active" ? 2 : 0))
    );
    const fmtPlayer = (name: string, status: string) => (name + statusMarker(status)).padEnd(playerColWidth, " ");
    const fmtValue = (kills: number, timePlayedDisplay: string) => {
        return sortBy === "timePlayed"
            ? timePlayedDisplay.slice(0, 7).padEnd(7, " ")
            : `${kills}`.padStart(7, " ");
    };

    const tableRows = visibleRows.map((row, idx) =>
        `${String(idx + 1).padStart(2, " ")} | ${fmtPlayer(row.platformUserHandle, row.status)} | ${fmtValue(row.kills, row.timePlayedDisplay)}`
    );

    const trimmedNote = rows.length > 20
        ? `\n...showing top 20/${rows.length} players`
        : "";

    const privateCount = rows.filter((r) => r.status === "private").length;
    const inactiveCount = rows.filter((r) => r.status === "inactive" || r.status === "not_found").length;
    const statusNote = (privateCount > 0 || inactiveCount > 0)
        ? `\n*${privateCount > 0 ? `${privateCount} private ` : ""}${inactiveCount > 0 ? `${inactiveCount} inactive/not found` : ""}*`
        : "";

    await safeReply(
        ` **${itemTitles[itemSub]}** (${sortBy})\n` +
        "```text\n" +
        `#  | ${"player".padEnd(playerColWidth, " ")} | ${valueLabel.padEnd(7, " ")}\n` +
        tableRows.join("\n") +
        "\n```" +
        trimmedNote +
        statusNote
    );
};
