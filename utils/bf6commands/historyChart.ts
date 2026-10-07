import sharp from "sharp";
import type { MonthlyRow } from "../bf6data";

function escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
    })[character]!);
}

/** Calendar slots preserve missing months instead of implying zero activity. */
export function historyChartPages(months: MonthlyRow[]): Array<Array<{ month: string; row?: MonthlyRow }>> {
    if (!months.length) return [];
    const byMonth = new Map(months.map(row => [row.month, row]));
    const sorted = [...byMonth.keys()].sort();
    const [year, month] = sorted[0].split("-").map(Number);
    const cursor = new Date(Date.UTC(year, month - 1, 1));
    const slots: Array<{ month: string; row?: MonthlyRow }> = [];
    while (cursor.toISOString().slice(0, 7) <= sorted.at(-1)!) {
        const key = cursor.toISOString().slice(0, 7);
        slots.push({ month: key, row: byMonth.get(key) });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    const pages: Array<typeof slots> = [];
    for (let i = 0; i < slots.length; i += 12) pages.push(slots.slice(i, i + 12));
    return pages;
}

/** Baselines contain lifetime totals, not activity for that calendar month. */
export function monthlyChartSlots(slots: ReturnType<typeof historyChartPages>[number]) {
    return slots.filter(slot => slot.row?.status !== "baseline");
}

export async function renderHistoryChart(title: string, slots: ReturnType<typeof historyChartPages>[number]): Promise<Buffer> {
    slots = monthlyChartSlots(slots);
    const width = 1200;
    const height = 980;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const text = (x: number, y: number, value: string, size = 14, color = "#94a3b8", anchor = "start") =>
        `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
    const step = 1020 / Math.max(slots.length, 1);
    const x = (index: number) => 110 + step * (index + 0.5);
    const panels = [
        { title: "KILLS / DEATHS", colors: ["#60a5fa", "#fb7185"], values: (row: MonthlyRow) => [row.kills, row.deaths], formats: [0, 0] },
        { title: "PLAYTIME (HOURS)", colors: ["#34d399"], values: (row: MonthlyRow) => [row.timePlayedValue / 3600], formats: [1] },
        { title: "K/D RATIO", colors: ["#c084fc"], values: (row: MonthlyRow) => [row.kdRatio / 100], formats: [2] },
    ].map((panel, panelIndex) => {
        const top = 155 + panelIndex * 245;
        const chartTop = top + 34;
        const chartHeight = 145;
        const values = slots.flatMap(slot => slot.row ? panel.values(slot.row) : []);
        const min = Math.min(0, ...values);
        const max = Math.max(1, ...values);
        const scale = (value: number) => chartTop + chartHeight * (max - value) / (max - min);
        const grids = Array.from({ length: 4 }, (_, index) => {
            const value = min + (max - min) * index / 3;
            const y = scale(value);
            const label = panel.formats[0] === 2 ? value.toFixed(2) : new Intl.NumberFormat("en", { maximumFractionDigits: 1, notation: "compact" }).format(value);
            return `<line x1="110" y1="${y}" x2="1130" y2="${y}" stroke="#263a57"/>${text(98, y + 5, label, 13, "#94a3b8", "end")}`;
        }).join("");
        const points = slots.map((slot, index) => {
            const label = slot.month.slice(2) + (slot.row?.status === "baseline" ? " B" : slot.row?.status === "resumed" ? " R" : "") + (slot.month === currentMonth ? "*" : "");
            const labels = text(x(index), top + 205, label, 12, "#cbd5e1", "middle");
            if (!slot.row) return labels + text(x(index), chartTop + 80, "No data", 12, "#64748b", "middle");
            const rowValues = panel.values(slot.row);
            const marks = rowValues.map((value, series) => {
                const y = scale(value);
                const previous = slots[index - 1]?.row;
                const line = previous ? `<line x1="${x(index - 1)}" y1="${scale(panel.values(previous)[series])}" x2="${x(index)}" y2="${y}" stroke="${panel.colors[series]}" stroke-width="3"/>` : "";
                const labelY = Math.max(top + 32, Math.min(top + 190, y + (series % 2 === 0 ? -10 - Math.floor(series / 2) * 16 : 19 + Math.floor(series / 2) * 16)));
                const label = new Intl.NumberFormat("en-US", { minimumFractionDigits: panel.formats[series], maximumFractionDigits: panel.formats[series] }).format(value);
                return line + `<circle cx="${x(index)}" cy="${y}" r="5" fill="${panel.colors[series]}"/>` + text(x(index), labelY, label, 12, panel.colors[series], "middle");
            }).join("");
            return labels + marks;
        }).join("");
        return `<rect x="30" y="${top - 10}" width="1140" height="230" rx="16" fill="#17243a"/>${text(58, top + 17, panel.title, 17, "#e2e8f0")}${grids}${points}`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="#07101f"/>
        <g font-family="sans-serif">
        ${text(42, 48, title.length > 75 ? title.slice(0, 72) + "..." : title, 28, "#f8fafc")}
        ${text(42, 78, slots.length ? `${slots[0].month} to ${slots.at(-1)!.month} | Monthly activity from recorded snapshots` : "No monthly activity yet — only baseline totals are available", 16)}
        ${text(42, 111, "Kills: blue   Deaths: pink   Playtime: green   K/D: purple", 15, "#cbd5e1")}
        ${panels}
        ${text(42, 923, "Baseline totals are excluded from charts and scales; they remain in the text table.", 15)}
        ${text(42, 950, "R = catch-up stats across missing months. Gaps = no recorded data. * = current month (partial).", 15)}
        </g>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
}
