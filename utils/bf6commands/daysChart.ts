import sharp from "sharp";
import type { aggregateWeekdayActivity } from "../bf6activity";

type Activity = ReturnType<typeof aggregateWeekdayActivity>;
type ChartActivity = Activity & { start?: Date; end?: Date };

function escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
    })[character]!);
}

export function weekdayChartSvg(title: string, days: number | null, report: ChartActivity, individual: boolean, recordsOnly = false): string {
    const rows = [...report.rows].sort((a, b) => (a.weekday + 6) % 7 - (b.weekday + 6) % 7);
    const hours = rows.map(row => row.seconds / 3600 / ((individual ? row.observedPlayerDays : row.occurrences) || 1));
    const peak = Math.max(0, ...hours);
    const scale = Math.max(1, peak);
    const text = (x: number, y: number, value: string, size = 16, color = "#94a3b8", anchor = "start") =>
        `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
    const grid = Array.from({ length: 5 }, (_, index) => {
        const value = scale * index / 4;
        const y = 440 - index * 65;
        return `<line x1="90" y1="${y}" x2="1070" y2="${y}" stroke="#263a57"/>` +
            text(78, y + 5, value.toFixed(1), 14, "#94a3b8", "end");
    }).join("");
    const bars = rows.map((row, index) => {
        const x = 160 + index * 140;
        const height = hours[index] / scale * 260;
        const color = peak > 0 && hours[index] === peak ? "#34d399" : "#60a5fa";
        const frequency = row.activePlayerDays / ((individual ? row.observedPlayerDays : row.occurrences) || 1);
        const unknown = individual && !row.observedPlayerDays;
        const label = individual ? unknown ? "No coverage" : `${Math.min(100, frequency * 100).toFixed(0)}% active` : `${frequency.toFixed(2)} players`;
        return `<rect x="${x - 40}" y="${440 - height}" width="80" height="${height}" rx="6" fill="${color}"/>` +
            text(x, 428 - height, unknown ? "—" : `${hours[index].toFixed(1)}h`, 19, color, "middle") +
            text(x, 472, row.day.slice(0, 3), 18, "#e2e8f0", "middle") +
            text(x, 502, label, 15, "#cbd5e1", "middle");
    }).join("");
    const records = (["hours", "players"] as const).map((metric, column) => {
        const x = 42 + column * 556;
        const cards = (["day", "week", "month"] as const).map((kind, index) => {
            const record = report.records[kind][metric];
            const y = 225 + index * 70;
            if (!record) return text(x + 18, y, `${kind.toUpperCase()}: No recorded activity`, 17);
            let label = record.key;
            if (kind === "week") {
                const sunday = new Date(new Date(record.key).getTime() + 6 * 86400000).toISOString().slice(0, 10);
                label += ` to ${sunday}`;
            }
            const suffix = `${record.partial ? " *" : ""}${record.ties ? ` (+${record.ties} tied)` : ""}`;
            return text(x + 18, y, `${kind.toUpperCase()} · ${label}${suffix}`, 16, "#e2e8f0") +
                text(x + 18, y + 27, `${(record.seconds / 3600).toFixed(1)}h · ${record.uniquePlayers} unique player${record.uniquePlayers === 1 ? "" : "s"}`, 18, metric === "hours" ? "#34d399" : "#60a5fa");
        }).join("");
        return `<rect x="${x}" y="155" width="536" height="258" rx="16" fill="#17243a"/>` +
            text(x + 18, 190, metric === "hours" ? "MOST HOURS" : "MOST UNIQUE PLAYERS", 20, "#f8fafc") + cards;
    }).join("");
    const body = recordsOnly
        ? text(42, 115, "Busiest actual day, calendar week and month · Estimated player-hours and distinct players", 18, "#e2e8f0") +
            records + text(42, 444, "Records within selected range · Weeks: Mon–Sun · * = partial period · Ties: earliest shown", 15)
        : text(42, 115, individual ? "Average hours per observed weekday date" : "Average combined player-hours per weekday occurrence", 18, "#e2e8f0") +
            text(42, 143, "Green = busiest weekday (by average hours)", 15) + grid + bars;
    const footer = recordsOnly ? 475 : 555;
    const range = days === null
        ? `All recorded history${report.start && report.end ? ` | ${report.start.toISOString().slice(0, 10)} to ${report.end.toISOString().slice(0, 10)}` : ""}`
        : `Last ${days} days`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${recordsOnly ? 595 : 670}">
        <rect width="100%" height="100%" fill="#07101f"/>
        <g font-family="sans-serif">
        ${text(42, 48, title.length > 65 ? title.slice(0, 62) + "..." : title, 26, "#f8fafc")}
        ${text(42, 80, `${range} | UTC | Estimated ${recordsOnly ? "activity records" : "weekday activity"}`)}
        ${body}
        ${text(42, footer, `Coverage: ${report.coverage.observedPercent.toFixed(0)}% of tracked player-time | ${report.acceptedIntervals}/${report.acceptedIntervals + report.skippedIntervals} intervals accepted (${report.coverage.acceptedPercent.toFixed(0)}%)`, 15, "#e2e8f0")}
        ${text(42, footer + 26, `${(report.uncertainSeconds / 3600).toFixed(1)}h unassigned from gaps over 24h | ${report.skippedIntervals} intervals excluded`, 15)}
        ${text(42, footer + 52, recordsOnly ? "Unique players counted once per period; combined hours do not imply simultaneous play." : individual ? "Active % = active / observed weekday dates; missing dates excluded. Partial dates count once." : "Group averages use the selected calendar window; hours do not imply simultaneous play.", 15)}
        ${text(42, footer + 78, "Estimates from snapshots. Coverage excludes time before tracking, but includes missing time afterward.", 15)}
        </g>
    </svg>`;
}

export async function renderWeekdayChart(title: string, days: number | null, report: ChartActivity, individual: boolean, recordsOnly = false): Promise<Buffer> {
    return sharp(Buffer.from(weekdayChartSvg(title, days, report, individual, recordsOnly))).png().toBuffer();
}
