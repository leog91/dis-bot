import type { MonthlyRow } from "../bf6data";
import type { SafeReply } from "./constants";
import { historyChartPages, renderHistoryChart } from "./historyChart";

export async function replyMonthlyHistory(title: string, months: MonthlyRow[], safeReply: SafeReply) {
    for (const [index, slots] of historyChartPages(months).entries()) {
        const rows = slots.map(({ month, row }) => {
            if (!row) return `${month} | No recorded data`;
            const status = row.status === "baseline" ? "baseline" : row.status === "resumed" ? "🔓 resumed" : "";
            return `${month} | ${row.timePlayedDisplay.padEnd(9)} | ${String(row.kills).padStart(7)} | ${String(row.deaths).padStart(7)} | ${(row.kdRatio / 100).toFixed(2).padStart(5)} | ${status}`;
        });
        const notes: string[] = [];
        if (slots.some(slot => slot.row?.status === "baseline")) notes.push("baseline = totals when tracking started");
        if (slots.some(slot => slot.row?.status === "resumed")) notes.push("🔓 resumed = catch-up stats after a private/missing period");
        const content = ` **${title.slice(0, 150)}**\n\`\`\`text\nmonth   | time      |  kills  | deaths |   k/d | status\n` +
            rows.join("\n") + "\n```" + (notes.length ? `\n*${notes.join(" | ")}*` : "");
        let image: Buffer;
        try {
            image = await renderHistoryChart(title, slots);
        } catch (error) {
            console.error("Could not render BF6 history chart:", error);
            await safeReply({ content: content + "\n⚠️ Could not generate the history chart." });
            continue;
        }
        await safeReply({ content, files: [{ attachment: image, name: `bf6-history-${index + 1}.png` }] });
    }
}
