import { getWeekdayActivity } from "../bf6data";
import { parseActivityArgs } from "../bf6activity";
import type { BF6Handler } from "./constants";
import { BF6_DAYS_HELP } from "./constants";
import { renderWeekdayChart } from "./daysChart";

export const daysHandler: BF6Handler = async (_sub, _msg, args, safeReply) => {
    if (args.slice(1).some(arg => arg === "--help" || arg === "-h") || args[1] === "help") {
        await safeReply(BF6_DAYS_HELP);
        return;
    }
    const recordsOnly = args.includes("--records");
    const options = parseActivityArgs(args.slice(1).filter(arg => arg !== "--records"));
    if (!options) {
        await safeReply(BF6_DAYS_HELP);
        return;
    }
    const report = await getWeekdayActivity(options.player, options.days);
    if (!report) {
        await safeReply(`No BF6 player found for "${options.player}".`);
        return;
    }
    if (!report.acceptedIntervals) {
        await safeReply(`Not enough closely spaced snapshots for activity ${options.days === null ? "across stored history" : `in the last ${options.days} days`}. Need consecutive snapshots at most 24h apart. Coverage: 0%; 0/${report.skippedIntervals} intervals accepted. ${(report.uncertainSeconds / 3600).toFixed(1)}h unassigned from long gaps; ${report.skippedIntervals} intervals excluded.`);
        return;
    }
    const individual = Boolean(report.player);
    let image: Buffer;
    try {
        image = await renderWeekdayChart(`BF6 ${recordsOnly ? "Activity Records" : "Weekday Activity"} — ${report.player?.platformUserHandle ?? "Group"}`, options.days, report, individual, recordsOnly);
    } catch (error) {
        console.error("Could not render BF6 weekday chart:", error);
        await safeReply("⚠️ Could not generate the weekday chart. Please try again.");
        return;
    }
    await safeReply({ files: [{ attachment: image, name: recordsOnly ? "bf6-records.png" : "bf6-weekdays.png" }] });
};
