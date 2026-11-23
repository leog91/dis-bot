import { BF6_GADGETS } from "../utils/bf6gadgets";
import { BF6_VEHICLES } from "../utils/bf6vehicles";
import { dayMs, formatMetric, historySeries, leaderboardMetrics, metricGroups, metrics, parseMetric, type Metric, type StatsReader } from "./bf6";
import { groupActivity, monthlyProgress, personalBests, recentProgress } from "./reports";

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const timestamp = (date: Date) => date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
const statusLabels = { private: "Private", inactive: "Inactive", not_found: "Not found" } as const;
const windows = [7, 30, 90, 365] as const;
const vehicleNames = new Map<string, string>(BF6_VEHICLES.map(({ key, title }) => [key, title]));
const gadgetNames = new Map<string, string>(BF6_GADGETS.map(({ key, title }) => [key, title]));
const count = (value: number) => value.toLocaleString("en-US");
const percent = (basisPoints: number) => `${(basisPoints / 100).toFixed(1)}%`;
const htmlHeaders = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
};

type TableCell = string | { text: string; value: number | null } | { text: string; href: string };
const numeric = (value: number | null, text = value === null ? "—" : count(value)): TableCell => ({ text, value });
const savedAt = (date: Date) => numeric(+date, timestamp(date));
const playerLink = (player: { id: string; name: string }): TableCell =>
    ({ text: player.name, href: `/player?${new URLSearchParams({ id: player.id })}` });

function dataTable(headers: string[], rows: TableCell[][], empty: string, descendingBy: number) {
    if (!rows.length) return `<p class="muted">${escape(empty)}</p>`;
    return `<div class="scroll"><table><thead><tr>${headers.map((header, i) =>
        `<th scope="col"${i === descendingBy ? ' aria-sort="descending"' : ""}><button type="button" data-sort-column="${typeof rows[0][i] !== "string" && "value" in rows[0][i] ? "number" : "text"}">${escape(header)}</button></th>`).join("")}</tr></thead>
<tbody>${rows.map(row => `<tr>${row.map(cell => typeof cell === "string" ? `<td>${escape(cell)}</td>`
        : "href" in cell ? `<td><a href="${escape(cell.href)}">${escape(cell.text)}</a></td>`
        : `<td data-sort-value="${cell.value ?? ""}">${escape(cell.text)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function page(title: string, content: string, status = 200) {
    return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · BF6 Dashboard</title>
<style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #11191f; color: #eef3f5; }
    * { box-sizing: border-box; }
    body { margin: auto; padding: 1.25rem clamp(.75rem, 2.5vw, 2.5rem); max-width: 104rem; }
    a { color: #83dfc5; } a:hover { color: #bcffe8; }
    header { border-bottom: 1px solid #34434c; padding-bottom: 1rem; }
    header a { font-weight: 700; text-decoration: none; }
    h1 { margin-bottom: .35rem; overflow-wrap: anywhere; }
    .muted { color: #b0c0ca; }
    .panel { margin: 1rem 0; padding: 1rem; background: #1a252c; border: 1px solid #34434c; border-radius: .5rem; }
    .scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; white-space: nowrap; font-variant-numeric: tabular-nums; }
    th, td { padding: .65rem; border-bottom: 1px solid #34434c; text-align: right; }
    th:first-child, td:first-child, th:nth-child(2), td:nth-child(2) { text-align: left; }
    tr:last-child td { border-bottom: 0; }
    form { display: flex; gap: .7rem 1rem; flex-wrap: wrap; align-items: center; }
    select, button { font: inherit; padding: .3rem .5rem; margin-left: .25rem; }
    [data-sort-column] { background: none; border: 0; padding: 0; margin: 0; font-weight: inherit; color: #83dfc5; cursor: pointer; }
    [data-sort-column]:hover { text-decoration: underline; }
    [data-sort-column]::after { content: " ↕" / ""; }
    th[aria-sort="ascending"] [data-sort-column]::after { content: " ↑" / ""; }
    th[aria-sort="descending"] [data-sort-column]::after { content: " ↓" / ""; }
    dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: 1rem; margin: 0; }
    dt { color: #b0c0ca; } dd { font-size: 1.35rem; font-weight: 600; margin: .25rem 0 0; }
    .stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .65rem; }
    .stat-grid > div { min-width: 0; border: 1px solid #34434c; border-radius: .325rem; padding: .6rem .75rem; }
    .stat-grid dd { overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
    .compare-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); gap: .75rem; }
    .compare-players { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .compare-card { min-width: 0; background: #11191f; border: 1px solid #34434c; border-radius: .5rem; padding: .85rem; }
    .compare-card h3 { margin: 0 0 .65rem; overflow-wrap: anywhere; }
    .compare-card p { margin: .45rem 0 0; }
    .compare-a { --player-color: #83dfc5; }
    .compare-b { --player-color: #aebcff; }
    .compare-player { border-top: 3px solid var(--player-color); }
    .compare-player a, .compare-name { color: var(--player-color); overflow-wrap: anywhere; }
    .compare-line + .compare-line { margin-top: .65rem; }
    .compare-label { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; }
    .compare-label strong { flex-shrink: 0; font-variant-numeric: tabular-nums; }
    .compare-bar { appearance: none; border: 0; display: block; width: 100%; height: .45rem; margin-top: .3rem; border-radius: 1rem; overflow: hidden; background: #34434c; }
    .compare-bar::-webkit-progress-bar { background: #34434c; }
    .compare-bar::-webkit-progress-value { background: var(--player-color); }
    .compare-bar::-moz-progress-bar { background: var(--player-color); }
    details { margin-top: 1rem; } summary { color: #83dfc5; cursor: pointer; }
    .sections { display: flex; gap: .5rem 1rem; flex-wrap: wrap; }
    svg { display: block; width: 100%; min-width: 28rem; height: auto; }
    svg text { fill: #b0c0ca; font-size: 13px; }
    .history-chart { margin: 1rem 0; }
    .history-chart svg { min-width: 38rem; }
    .chart-summary { display: flex; gap: .25rem 1rem; flex-wrap: wrap; margin-bottom: .5rem; }
    .chart-readout { margin: .5rem 0; padding: .6rem .75rem; border-left: 3px solid #83dfc5; background: #11191f; }
    [data-chart-point] { fill: #83dfc5; stroke: transparent; stroke-width: 10; cursor: crosshair; }
    [data-chart-point].selected { fill: #fff; stroke: #83dfc5; stroke-width: 2; r: 5; }
    @media (max-width: 68rem) {
        .panel { padding: .75rem; }
        th, td { padding: .5rem; }
        th, th button, td:not([data-sort-value]) { white-space: normal; }
        td a { overflow-wrap: anywhere; }
    }
    @media (max-width: 36rem) {
        body { padding-block: .75rem; }
        th, td { padding: .4rem; }
        .panel { padding: .6rem; }
        table { min-width: 32rem; }
        .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .stat-grid dd { font-size: 1.1rem; }
        .compare-players { grid-template-columns: 1fr; }
    }
</style>
</head>
<body><header><nav class="sections" aria-label="Dashboard"><a href="/">BF6 Dashboard</a><a href="/recent">Recent gains</a><a href="/compare">Compare players</a><a href="/monthly">Monthly progress</a><a href="/activity">Group activity</a><a href="/gear">Gear rankings</a></nav></header>
<main>${content}</main><script type="module" src="/history.js"></script></body></html>`, {
        status,
        headers: htmlHeaders,
    });
}

function leaderboard(stats: StatsReader, sort: Metric) {
    const value = metrics[sort].value;
    const rows = stats.leaderboard().sort((a, b) => {
        const av = a.snapshot ? value(a.snapshot) : null;
        const bv = b.snapshot ? value(b.snapshot) : null;
        return (bv ?? -1) - (av ?? -1) || a.name.localeCompare(b.name);
    });
    return page("Leaderboard", `<h1>Leaderboard</h1>
<p class="muted">Latest stored lifetime stats. Reload for new snapshots.</p>
${rows.length ? `<div class="panel scroll"><table><thead><tr><th scope="col">#</th><th scope="col">Player</th>
${leaderboardMetrics.map(key => `<th scope="col"${key === sort ? ' aria-sort="descending"' : ""}><a href="/?sort=${key}">${metrics[key].label}${key === sort ? " ↓" : ""}</a></th>`).join("")}
<th scope="col">Last snapshot</th></tr></thead><tbody>
${rows.map(({ id, name, status, snapshot }, i) => `<tr><td>${i + 1}</td>
<td><a href="/player?${escape(new URLSearchParams({ id, metric: sort }).toString())}">${escape(name)}</a>${status === "active" ? "" : ` <small class="muted">(${statusLabels[status]})</small>`}</td>
${leaderboardMetrics.map(key => `<td>${formatMetric(key, snapshot ? metrics[key].value(snapshot) : null)}</td>`).join("")}
<td>${snapshot ? timestamp(snapshot.date) : "—"}</td></tr>`).join("")}
</tbody></table></div>` : '<p class="panel">No tracked BF6 players yet.</p>'}`);
}

const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
const fullDateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function dateTicks(from: Date, to: Date) {
    const days = (+to - +from) / dayMs;
    const dates: Date[] = [];
    const date = new Date(+from);
    if (days > 90) {
        date.setUTCDate(1);
        date.setUTCHours(0, 0, 0, 0);
        for (; date <= to; date.setUTCMonth(date.getUTCMonth() + 2)) {
            if (date >= from) dates.push(new Date(+date));
        }
        return dates.map(date => ({ date, label: monthLabel.format(date) }));
    }
    date.setUTCHours(0, 0, 0, 0);
    const step = days <= 7 ? 1 : days <= 30 ? 7 : 14;
    if (step > 1) date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    for (; date <= to; date.setUTCDate(date.getUTCDate() + step)) {
        if (date >= from) dates.push(new Date(+date));
    }
    return dates.map(date => ({ date, label: dayLabel.format(date) }));
}

function chart(series: ReturnType<typeof historySeries>, metric: Metric, from: Date, to: Date) {
    const { points } = series;
    const plotted = points.filter(point => point.value !== null);
    if (!plotted.length) return '<p>No snapshots with this metric in the selected range.</p>';
    let min = Infinity;
    let max = -Infinity;
    for (const { value } of plotted) {
        min = Math.min(min, value);
        max = Math.max(max, value);
    }
    const x = (date: Date) => (105 + (+date - +from) / (+to - +from) * 842).toFixed(2);
    const padding = (max - min) * .06;
    const y = (value: number) => (max === min ? 114 : 206 - (value - min + padding) / (max - min + 2 * padding) * 184).toFixed(2);
    const path = points.map(({ date, value, connect }) =>
        value === null ? "" : `${connect ? "L" : "M"}${x(date)} ${y(value)}`).join(" ");
    const fractional = ["kd", "playtime", "winRate", "accuracy", "aiShare", "kpm", "dpm"].includes(metric);
    const levels = min === max ? [min] : Array.from(new Map(
        Array.from({ length: 5 }, (_, i) => {
            const tick = min + (max - min) * i / 4;
            const value = fractional ? tick : Math.round(tick);
            return [formatMetric(metric, value), value] as const;
        }),
    ).values());
    const label = metrics[metric].label;
    const latest = plotted.at(-1);
    const pointText = (point: typeof latest, index: number) => {
        const change = point.connect ? formatMetric(metric, point.value - points[index - 1].value, true) : null;
        return `${timestamp(point.date)} · ${label}: ${formatMetric(metric, point.value)} · ${point.source}${change ? ` · ${change} since previous snapshot` : ""}`;
    };
    return `<figure class="history-chart">
<figcaption class="chart-summary"><strong>${label} over time</strong>
<span class="muted">${fullDateLabel.format(from)} – ${fullDateLabel.format(to)} (UTC)</span>
<span class="muted">${count(plotted.length)} of ${count(points.length)} snapshots plotted</span></figcaption>
<p class="chart-readout" aria-live="polite"><strong data-chart-caption>Latest plotted:</strong> <span data-chart-readout>${escape(pointText(latest, points.lastIndexOf(latest)))}</span></p>
<div class="scroll" data-chart-plot tabindex="0" aria-label="${label} chart. Use arrow keys to inspect snapshots.">
<svg viewBox="0 0 990 252" role="img" aria-label="${label} over time">
${dateTicks(from, to).map(({ date, label }) => `<line x1="${x(date)}" x2="${x(date)}" y1="22" y2="206" stroke="#34434c" stroke-dasharray="2 4"/>
<text x="${x(date)}" y="229" text-anchor="middle">${label}</text>`).join("")}
${levels.map(value => `<line x1="105" x2="947" y1="${y(value)}" y2="${y(value)}" stroke="#34434c"/>
<text x="96" y="${y(value)}" text-anchor="end" dominant-baseline="middle">${formatMetric(metric, value)}</text>`).join("")}
<path d="${path}" fill="none" stroke="#83dfc5" stroke-width="2"/>
${points.map((point, i) => point.value === null ? "" : `<circle cx="${x(point.date)}" cy="${y(point.value)}" r="3" data-chart-point="${escape(pointText(point, i))}"${point === latest ? ' class="selected"' : ""}/>`).join("")}
</svg></div><small class="muted">Hover or tap a point for details. With the chart focused, use ← and → to move between snapshots.</small></figure>`;
}

function gear(stats: StatsReader, id: string) {
    const weapons = stats.weapons(id);
    const classes = stats.classes(id);
    const items = stats.items(id);
    const itemTable = (names: Map<string, string> | null, heading: string) => dataTable(
        [heading, "Kills", "Playtime", "Last saved"],
        items.filter(item => names ? names.has(item.itemKey) : !vehicleNames.has(item.itemKey) && !gadgetNames.has(item.itemKey))
            .map(row => [names?.get(row.itemKey) ?? row.itemKey, numeric(row.kills), numeric(row.timePlayedValue, row.timePlayedDisplay), savedAt(row.scrapedAt)]),
        `No saved ${heading.toLowerCase()} stats.`, 1,
    );
    const hasOther = items.some(({ itemKey }) => !vehicleNames.has(itemKey) && !gadgetNames.has(itemKey));
    return `<section class="panel" id="gear"><h2>Weapons, classes &amp; gear</h2>
<p class="muted">Latest saved totals per entry, not historical series. Vehicle and gadget groups can overlap with their individual entries.</p>
<h3>Weapons <small class="muted">(${weapons.length})</small></h3>
${dataTable(["Weapon", "Kills", "Playtime", "Accuracy", "Headshots", "ADS kills", "Hip-fire kills", "Last saved"],
    weapons.map(row => [row.weaponName, numeric(row.kills), numeric(row.timePlayedValue, row.timePlayedDisplay),
        numeric(row.accuracyPct, `${percent(row.accuracyPct)} (${count(row.shotsHit)} / ${count(row.shotsFired)})`),
        numeric(row.headshots, `${count(row.headshots)} (${percent(row.headshotPct)})`),
        numeric(row.adsKills, `${count(row.adsKills)} (${percent(row.adsPct)})`),
        numeric(row.hipfireKills, `${count(row.hipfireKills)} (${percent(row.hipfirePct)})`),
        savedAt(row.scrapedAt)]), "No saved weapon stats.", 1)}
<h3>Classes</h3>
${dataTable(["Class", "Playtime", "Kills", "Deaths", "K/D", "Assists", "Revives", "Deployments", "Last saved"],
    classes.map(row => [row.className, numeric(row.timePlayedValue, row.timePlayedDisplay), numeric(row.kills), numeric(row.deaths),
        numeric(row.kdRatio, (row.kdRatio / 100).toFixed(2)), numeric(row.assists), numeric(row.revives), numeric(row.deployments), savedAt(row.scrapedAt)]),
    "No saved class stats.", 1)}
<h3>Vehicles</h3>${itemTable(vehicleNames, "Vehicle")}
<h3>Gadgets</h3>${itemTable(gadgetNames, "Gadget")}
${hasOther ? `<h3>Other tracked items</h3>${itemTable(null, "Item")}` : ""}
</section>`;
}

function playerIdentity(stats: StatsReader, player: { id: string; profileUrl: string }) {
    const aliases = stats.aliases(player.id);
    let profile: URL | undefined;
    try {
        const url = new URL(player.profileUrl);
        if (url.protocol === "https:" || url.protocol === "http:") profile = url;
    } catch { /* Some tracked players have no profile URL. */ }
    return `<section class="panel" id="identity"><h2>Profiles &amp; aliases</h2>
${profile ? `<p><a href="${escape(profile.href)}" target="_blank" rel="noopener noreferrer">Open saved profile (${escape(profile.hostname)})</a></p>` : ""}
<p class="muted">Alias dates show when the bot observed a handle, not when the player changed it.</p>
${dataTable(["Handle", "Platform", "Source", "First seen", "Last seen"], aliases.map(row =>
    [row.handle, row.namespace, row.source, savedAt(row.firstSeenAt), savedAt(row.lastSeenAt)]), "No saved aliases.", 4)}
</section>`;
}

const option = (value: string, label: string, selected: string) =>
    `<option value="${escape(value)}"${value === selected ? " selected" : ""}>${escape(label)}</option>`;

const progressDays = [7, 30, 90];
const progressRange = (params: URLSearchParams) => progressDays.find(days => String(days) === params.get("days")) ?? 7;
const rangeOptions = (days: number) => progressDays.map(value => option(String(value), `${value} days`, String(days))).join("");
const spanLabel = (span: number | null) => span === null ? "—" : `${Math.round(span * 100)}%`;
const gapLabel = (gap: number) => gap >= dayMs ? `${(gap / dayMs).toFixed(1)} d` : `${(gap / 3_600_000).toFixed(1)} h`;
const providerLabel = (source: string) => source === "gametools" ? "GameTools" : source === "tracker" ? "Tracker" : source;
const periodNote = `<p class="muted">Gains use the first and last snapshots inside the selected range. A dash means there aren’t enough comparable snapshots, a counter reset, or no deaths for period K/D. Snapshot span measures how much of the range lies between the first and last snapshots; gaps can still exist inside that span.</p>`;

function recentPage(stats: StatsReader, params: URLSearchParams, now: Date) {
    const days = progressRange(params);
    const { start, end, rows } = recentProgress(stats, days, now);
    rows.sort((a, b) => (b.hours ?? -1) - (a.hours ?? -1) || (b.kills ?? -1) - (a.kills ?? -1));
    return page("Recent gains", `<h1>Recent gains</h1>
<section class="panel"><form action="/recent" data-auto-submit><label>Range <select name="days">${rangeOptions(days)}</select></label><button type="submit">Show gains</button></form>
<p>${timestamp(start)} → ${timestamp(end)}</p>
${dataTable(["Player", "Playtime gained", "Human kills gained", "Deaths gained", "Revives gained", "Period K/D", "Snapshots", "Snapshot span"],
    rows.map(row => [playerLink(row), numeric(row.hours, formatMetric("playtime", row.hours)), numeric(row.kills), numeric(row.deaths),
        numeric(row.revives), numeric(row.kd, formatMetric("kd", row.kd)), numeric(row.snapshots), numeric(row.span, spanLabel(row.span))]),
    "No tracked players yet.", 1)}${periodNote}</section>`);
}

function comparePage(stats: StatsReader, params: URLSearchParams, now: Date) {
    const players = stats.players();
    if (players.length < 2) return page("Compare players", "<h1>Compare players</h1><p>At least two tracked players are needed.</p>");
    const days = progressRange(params);
    const first = players.find(player => player.id === params.get("first")) ?? players[0];
    const second = players.find(player => player.id === params.get("second")) ?? players.find(player => player.id !== first.id);
    const playerOptions = (selected: string) => players.map(player => option(player.id, player.name, selected)).join("");
    const afterSwitch = params.get("afterSwitch") === "1";
    const { start, end, rows, clipped } = recentProgress(stats, days, now, [first.id, second.id], afterSwitch);
    const comparison = [first, second].map(player => rows.find(row => row.id === player.id));
    const hasSwitch = comparison.some(row => row.providerSwitch);
    const toggleParams = new URLSearchParams({ first: first.id, second: second.id, days: String(days) });
    if (!clipped) toggleParams.set("afterSwitch", "1");
    const providerNote = hasSwitch ? `<p role="status">${clipped
        ? `Showing only snapshots after the latest provider switch for either player.`
        : `The full range crosses a provider switch. Gains that would combine providers aren’t shown.`}
<a href="/compare?${escape(toggleParams.toString())}">${clipped ? "Show full range" : "Compare after provider switch"}</a></p>` : "";
    type ComparisonRow = typeof comparison[number];
    const visualMetrics = [
        ["kills", "kills", "Human kills gained"],
        ["deaths", "deaths", "Deaths gained"],
        ["kd", "kd", "Period K/D"],
        ["revives", "revives", "Revives gained"],
        ["hours", "playtime", "Playtime gained"],
    ] as const;
    const profileHref = (id: string) => `/player?${escape(new URLSearchParams({ id }).toString())}`;
    const color = (index: number) => index === 0 ? "compare-a" : "compare-b";
    const bar = (value: number, max: number) => `<progress class="compare-bar" value="${value}" max="${max}" aria-hidden="true"></progress>`;
    const measures: [string, (row: ComparisonRow) => string][] = [
        ...visualMetrics.map(([key, metric, label]): [string, (row: ComparisonRow) => string] =>
            [label, row => formatMetric(metric, row[key])]),
        ["Snapshots", row => count(row.snapshots)],
        ["First snapshot", row => row.first ? timestamp(row.first) : "—"],
        ["Last snapshot", row => row.last ? timestamp(row.last) : "—"],
        ["Snapshot span", row => spanLabel(row.span)],
        ["Longest gap between snapshots", row => row.snapshots > 1 ? gapLabel(row.longestGap) : "—"],
    ];
    const visuals = `<h2>Snapshot coverage</h2>
<div class="compare-grid compare-players">${comparison.map((row, index) => `<article class="compare-card compare-player ${color(index)}">
<h3><a href="${profileHref(row.id)}">${escape(row.name)}</a></h3>
<p>${count(row.snapshots)} saved ${row.snapshots === 1 ? "snapshot" : "snapshots"}${row.span === null ? "" : ` · ${spanLabel(row.span)} of range spanned`}</p>
${row.span === null ? "" : bar(row.span, 1)}
<p class="muted">${row.snapshots > 1 ? `Longest gap: ${gapLabel(row.longestGap)}` : "Not enough snapshots to measure gains."}</p>
${row.providerSwitch ? `<p>Provider changed on ${timestamp(row.providerSwitch.date)}:
${escape(providerLabel(row.providerSwitch.from))} → ${escape(providerLabel(row.providerSwitch.to))}.</p>` : ""}
</article>`).join("")}</div>
<h2>Performance in this range</h2>
${clipped && comparison.every(row => row.provider) && comparison[0].provider !== comparison[1].provider
    ? '<p class="muted">These players still use different providers. Their stats may be measured differently.</p>' : ""}
<p class="muted">Bars share a scale within each metric. A dash means no comparable value, not zero.</p>
<div class="compare-grid">${visualMetrics.map(([key, metric, label]) => {
    const max = Math.max(...comparison.map(row => row[key] ?? 0)) || 1;
    return `<article class="compare-card"><h3>${label}</h3>${comparison.map((row, index) =>
        `<div class="compare-line ${color(index)}"><div class="compare-label"><span class="compare-name">${escape(row.name)}</span>
<strong>${formatMetric(metric, row[key])}</strong></div>${row[key] === null ? "" : bar(row[key], max)}</div>`).join("")}</article>`;
}).join("")}</div>`;
    return page("Compare players", `<h1>Compare players</h1>
<section class="panel"><form action="/compare" data-auto-submit>
${clipped ? '<input type="hidden" name="afterSwitch" value="1">' : ""}
<label>First player <select name="first">${playerOptions(first.id)}</select></label>
<label>Second player <select name="second">${playerOptions(second.id)}</select></label>
<label>Range <select name="days">${rangeOptions(days)}</select></label><button type="submit">Compare</button></form>
<p>${clipped ? "Effective range: " : ""}${timestamp(start)} → ${timestamp(end)}</p>
${first.id === second.id ? '<p role="status">Choose two different players to compare.</p>' :
    `${providerNote}${visuals}<details><summary>Show detailed comparison table</summary>
<div class="scroll"><table><thead><tr><th scope="col">Metric</th>${comparison.map(row =>
        `<th scope="col"><a href="${profileHref(row.id)}">${escape(row.name)}</a></th>`).join("")}</tr></thead>
<tbody>${measures.map(([label, get]) => `<tr><th scope="row">${label}</th>${comparison.map(row => `<td>${escape(get(row))}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`}
${periodNote}</section>`);
}

function personalBestsSection(stats: StatsReader, id: string, now: Date) {
    const records = personalBests(stats, id, now);
    const rows = [
        ["Human kills", records.kills, "kills"],
        ["Revives", records.revives, "revives"],
        ["Playtime", records.playtime, "playtime"],
    ] as const;
    return `<section class="panel" id="bests"><h2>Personal bests</h2>
<p class="muted">Best recorded gains in completed UTC months with a comparable baseline from the preceding month. A dash means no positive comparable record.</p>
<dl class="stat-grid">${rows.map(([label, record, metric]) => `<div><dt>${label}</dt><dd>${record
        ? formatMetric(metric, metric === "playtime" ? record.value / 3600 : record.value) : "—"}</dd>
${record ? `<a href="/monthly?month=${record.month}">${record.month}</a>` : ""}</div>`).join("")}</dl></section>`;
}

function monthlyPage(stats: StatsReader, params: URLSearchParams, now: Date) {
    const months = stats.months(now);
    const selected = params.get("month");
    const month = months.find(value => value === selected) ?? months[0];
    const rows = month ? monthlyProgress(stats, month, now) : [];
    return page("Monthly progress", `<h1>Monthly progress</h1>
<p class="muted">UTC calendar months. Changes are measured from the last saved snapshot before the month to the last one in it. Lifetime totals, missing baselines, and gaps across whole months aren’t counted as monthly gains.</p>
<section class="panel">
${month ? `<form action="/monthly" data-auto-submit><label>Month <select name="month">${months.map(value => option(value, value, month)).join("")}</select></label><button type="submit">Show month</button></form>
<p>${count(rows.filter(row => row.kills !== null).length)} of ${count(rows.length)} players have comparable snapshots.</p>` : ""}
${dataTable(["Player", "Human kills gained", "Deaths gained", "Period K/D", "Playtime gained", "Snapshot coverage"],
    rows.map(row => [playerLink(row), numeric(row.kills), numeric(row.deaths), numeric(row.kd, formatMetric("kd", row.kd)),
        numeric(row.hours, formatMetric("playtime", row.hours)), row.note]), "No monthly snapshots yet.", 1)}
</section>`);
}

function activityPage(stats: StatsReader, params: URLSearchParams, now: Date) {
    const days = ["7", "30", "90", "365", "all"].find(value => value === params.get("days")) ?? "90";
    const activity = groupActivity(stats, days === "all" ? null : Number(days), now);
    const hours = (seconds: number) => numeric(seconds, `${(seconds / 3600).toFixed(2)} h`);
    const weekdays = [...activity.rows.slice(1), activity.rows[0]];
    const busiest = weekdays.filter(row => row.seconds > 0 && row.occurrences > 0)
        .sort((a, b) => b.seconds / b.occurrences - a.seconds / a.occurrences)[0];
    const activeRows = weekdays.map(row => {
        const average = row.occurrences ? row.seconds / row.occurrences : null;
        const players = row.occurrences ? row.activePlayerDays / row.occurrences : null;
        return [row.day, hours(row.seconds), average === null ? numeric(null) : hours(average),
            numeric(players, players === null ? "—" : players.toFixed(2))];
    });
    const records = (["day", "week", "month"] as const).flatMap(period => (["hours", "players"] as const).flatMap(metric => {
        const row = activity.records[period][metric];
        return row ? [[period, metric === "hours" ? "Most playtime" : "Most active players",
            `${row.key}${row.partial ? " (partial)" : ""}`, hours(row.seconds), numeric(row.uniquePlayers), numeric(row.ties)]] : [];
    }));
    return page("Group activity", `<h1>Group activity</h1>
<p class="muted">Estimated from changes in saved playtime, not actual session logs. Weeks start Monday; all dates use UTC.</p>
<section class="panel"><form action="/activity" data-auto-submit><label>Range <select name="days">
${["7", "30", "90", "365", "all"].map(value => option(value, value === "all" ? "All history" : `${value} days`, days)).join("")}
</select></label><button type="submit">Show activity</button></form>
<p>${timestamp(activity.start)} → ${timestamp(now)}</p>
<p><strong>Coverage:</strong> ${activity.coverage.observedPercent.toFixed(1)}% of tracked player-time ·
${count(activity.acceptedIntervals)} accepted / ${count(activity.acceptedIntervals + activity.skippedIntervals)} intervals ·
${(activity.uncertainSeconds / 3600).toFixed(2)} h unassigned across long gaps.</p>
<h2>Activity by weekday</h2>
${busiest ? `<p><strong>Busiest on average:</strong> ${busiest.day} (${(busiest.seconds / busiest.occurrences / 3600).toFixed(2)} player-hours)</p>` : ""}
${activity.acceptedIntervals ? dataTable(["Weekday", "Total player-hours", "Average hours per weekday", "Average active players"],
    activeRows, "", -1) : '<p class="muted">No comparable playtime observations in this range.</p>'}
<h2>Activity records</h2>
${dataTable(["Period", "Ranked by", "Date / week start", "Player-hours", "Distinct players", "Other ties"],
    records, "No activity records in this range.", -1)}</section>`);
}

function gearRankings(stats: StatsReader, params: URLSearchParams) {
    const categories = { weapon: "Weapons", class: "Classes", vehicle: "Vehicles", gadget: "Gadgets", other: "Other tracked items" };
    const category = (Object.keys(categories) as (keyof typeof categories)[])
        .find(key => key === params.get("category")) ?? "weapon";
    const kind = category === "weapon" || category === "class" ? category : "item";
    const options = stats.gearOptions(kind).filter(({ key }) => category === "vehicle" ? vehicleNames.has(key)
        : category === "gadget" ? gadgetNames.has(key) : category === "other" ? !vehicleNames.has(key) && !gadgetNames.has(key) : true)
        .map(row => ({ ...row, name: (category === "vehicle" ? vehicleNames.get(row.key)
            : category === "gadget" ? gadgetNames.get(row.key) : undefined) ?? row.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const item = options.find(row => row.key === params.get("item")) ?? options[0];
    const rows = item ? stats.gearLeaderboard(kind, item.key) : [];
    return page("Gear rankings", `<h1>Gear rankings</h1>
<p class="muted">Compare the latest totals saved for each player. These are not historical rankings.</p>
<nav class="sections" aria-label="Gear categories">${Object.entries(categories).map(([key, label]) =>
    `<a href="/gear?category=${key}"${category === key ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
<section class="panel">
${item ? `<form action="/gear" data-auto-submit><input type="hidden" name="category" value="${category}">
<label>${categories[category]} <select name="item">${options.map(row => option(row.key, row.name, item.key)).join("")}</select></label>
<button type="submit">Show ranking</button></form><h2>${escape(item.name)}</h2>` : ""}
${dataTable(["Player", "Kills", "Playtime", "Last saved"],
    rows.map(row => [playerLink(row), numeric(row.kills), numeric(row.time, row.timeDisplay), savedAt(row.date)]),
    "No saved entries in this category.", 1)}</section>`);
}

function playerPage(stats: StatsReader, params: URLSearchParams, to: Date, fragment = false) {
    const id = params.get("id");
    const player = id && stats.player(id);
    if (!player) return page("Player not found", "<h1>Player not found</h1><p><a href=\"/\">Back to leaderboard</a></p>", 404);

    const metric = parseMetric(params.get("metric"));
    const days = windows.find(days => String(days) === params.get("days")) ?? 30;
    const from = new Date(+to - days * dayMs);
    const series = historySeries(stats.history(player.id, from, to), metric);
    const { snapshot } = player;
    const first = series.points[0];
    const last = series.points.at(-1);
    const history = `<p><strong>Observed change:</strong> ${formatMetric(metric, series.change, true)}
${series.change !== null ? `<span class="muted">(${timestamp(first.date)} → ${timestamp(last.date)})</span>` : '<span class="muted">(needs comparable snapshots within the range)</span>'}</p>
${chart(series, metric, from, to)}
<p class="muted">Points are stored snapshots, not sessions. Lines break at gaps over 24 hours, missing values, provider changes, or counter resets.</p>
${series.points.length ? `<details><summary>Recent snapshots in this range (${Math.min(30, series.points.length)} of ${series.points.length})</summary>
${dataTable(["Saved at", metrics[metric].label, "Provider"], series.points.slice(-30).reverse().map(point =>
    [savedAt(point.date), numeric(point.value, formatMetric(metric, point.value)), point.source]), "", 0)}</details>` : ""}`;

    if (fragment) return new Response(history, { headers: htmlHeaders });

    return page(player.name, `<h1>${escape(player.name)}</h1>
<p class="muted">${player.status === "active" ? "" : `${statusLabels[player.status]} · `}
${snapshot ? `Latest snapshot: ${timestamp(snapshot.date)} · ${escape(snapshot.source)}` : "No saved snapshots yet."}</p>
<nav class="sections" aria-label="Player sections"><a href="#totals">Lifetime totals</a><a href="#history">History</a><a href="#bests">Personal bests</a><a href="#gear">Weapons, classes &amp; gear</a><a href="#identity">Profiles &amp; aliases</a><a href="/compare?${escape(new URLSearchParams({ first: player.id }).toString())}">Compare player</a></nav>
<section class="panel" id="totals"><h2>Lifetime totals</h2>
${snapshot ? '<p class="muted">— means the latest snapshot didn’t include a value for that stat.</p>' : ""}
${metricGroups.map(({ label, keys }) => `<h3>${label}</h3><dl class="stat-grid">
${keys.map(key => `<div><dt>${metrics[key].label}</dt><dd>${formatMetric(key, snapshot ? metrics[key].value(snapshot) : null)}</dd></div>`).join("")}
</dl>`).join("")}</section>
<section class="panel" id="history"><h2>History</h2>
<form action="/player#history">
<input type="hidden" name="id" value="${escape(player.id)}">
<label>Range <select name="days">${windows.map(window => `<option value="${window}"${window === days ? " selected" : ""}>${window} days</option>`).join("")}</select></label>
<label>Metric <select name="metric">${metricGroups.map(({ label, keys }) => `<optgroup label="${label}">${keys.map(key => `<option value="${key}"${key === metric ? " selected" : ""}>${metrics[key].label}</option>`).join("")}</optgroup>`).join("")}</select></label>
<button type="submit">Apply</button></form>
<span id="history-status" role="status" class="muted"></span>
<div id="history-results">${history}</div>
</section>
${personalBestsSection(stats, player.id, to)}
${gear(stats, player.id)}
${playerIdentity(stats, player)}`);
}

export function createDashboard(stats: StatsReader, now = () => new Date()) {
    return (request: Request) => {
        if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
        const { pathname, searchParams } = new URL(request.url);
        if (pathname === "/") return leaderboard(stats, parseMetric(searchParams.get("sort"), leaderboardMetrics));
        if (pathname === "/player") return playerPage(stats, searchParams, now());
        if (pathname === "/player/history") return playerPage(stats, searchParams, now(), true);
        if (pathname === "/monthly") return monthlyPage(stats, searchParams, now());
        if (pathname === "/recent") return recentPage(stats, searchParams, now());
        if (pathname === "/compare") return comparePage(stats, searchParams, now());
        if (pathname === "/activity") return activityPage(stats, searchParams, now());
        if (pathname === "/gear") return gearRankings(stats, searchParams);
        if (pathname === "/history.js") return new Response(Bun.file(new URL("./history.js", import.meta.url)), {
            headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
        });
        return page("Not found", "<h1>Page not found</h1>", 404);
    };
}
