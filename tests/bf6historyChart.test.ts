import { describe, expect, it } from "bun:test";
import sharp from "sharp";
import { historyChartPages, monthlyChartSlots, renderHistoryChart } from "../utils/bf6commands/historyChart";
import type { MonthlyRow } from "../utils/bf6data";
import { replyMonthlyHistory } from "../utils/bf6commands/historyReply";
import type { MessageReplyOptions } from "discord.js";

function row(month: string, status: MonthlyRow["status"] = "ok"): MonthlyRow {
    return { month, kills: 100, deaths: 50, timePlayedValue: 7200, timePlayedDisplay: "2h 0m", kdRatio: 200, status };
}

describe("BF6 history charts", () => {
    it("excludes lifetime baselines from chart data while retaining monthly values and gaps", () => {
        const months = [row("2025-01", "baseline"), row("2025-02"), row("2025-04", "resumed")];
        const page = historyChartPages(months)[0];
        const chartSlots = monthlyChartSlots(page);
        expect(chartSlots.map(slot => slot.month)).toEqual(["2025-02", "2025-03", "2025-04"]);
        expect(chartSlots[0].row).toEqual(months[1]);
        expect(chartSlots[1].row).toBeUndefined();
        expect(chartSlots[2].row?.status).toBe("resumed");
        expect(page[0].row?.status).toBe("baseline");
        expect(monthlyChartSlots(historyChartPages([months[0]])[0])).toEqual([]);
    });
    it("preserves calendar gaps and splits long histories into twelve-month pages", () => {
        const pages = historyChartPages([row("2026-02", "resumed"), row("2025-01", "baseline")]);
        expect(pages.map(page => page.length)).toEqual([12, 2]);
        expect(pages[0][0].month).toBe("2025-01");
        expect(pages[0][1]).toEqual({ month: "2025-02", row: undefined });
        expect(pages[1][1].row?.status).toBe("resumed");
        expect(historyChartPages([])).toEqual([]);
    });

    it("renders PNGs for single-month, zero, negative and gapped data with XML-sensitive titles", async () => {
        const zero = { ...row("2025-01", "baseline"), kills: 0, deaths: 0, kdRatio: 0, timePlayedValue: 0 };
        const negative = { ...row("2025-03", "resumed"), kills: -10, timePlayedValue: -3600 };
        for (const rows of [[zero], [{ ...zero, status: "ok" as const }], [zero, negative]]) {
            const image = await renderHistoryChart('Player <A&B> "History"', historyChartPages(rows)[0]);
            const metadata = await sharp(image).metadata();
            expect(metadata.format).toBe("png");
            expect(metadata.width).toBe(1200);
            expect(metadata.height).toBe(980);
        }
    });

    it("sends each table page and its chart in the same Discord-sized message", async () => {
        const replies: MessageReplyOptions[] = [];
        await replyMonthlyHistory("Monthly history", [row("2025-01", "baseline"), row("2026-02", "resumed")], async reply => {
            expect(typeof reply).toBe("object");
            replies.push(reply as MessageReplyOptions);
        });
        expect(replies).toHaveLength(2);
        expect(replies[0].content).toContain("2025-01");
        expect(replies[0].content).not.toContain("2026-02");
        expect(replies[1].content).toContain("2026-02");
        for (const reply of replies) {
            expect(reply.content!.length).toBeLessThanOrEqual(2000);
            expect(reply.files).toHaveLength(1);
        }
    });
});
