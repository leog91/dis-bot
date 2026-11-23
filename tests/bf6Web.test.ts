import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { eq } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { bf6ClassSnapshots, bf6ItemSnapshots, bf6PlayerAliases, bf6Players, bf6Scrapes, bf6WeaponPlaystyles } from "../db/schema";
import { createStatsReader, dayMs, historySeries } from "../web/bf6";
import { groupActivity, monthlyProgress, personalBests, recentProgress } from "../web/reports";
import { createDashboard } from "../web/views";

const now = new Date("2026-08-15T12:00:00Z");
const ago = (days: number) => new Date(+now - days * dayMs);
let client: Database;
let stats: ReturnType<typeof createStatsReader>;
let dashboard: ReturnType<typeof createDashboard>;

beforeEach(() => {
    client = new Database(":memory:");
    const db = drizzle(client);
    migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
    db.insert(bf6Players).values([
        { id: `one&"`, user: "one", platformUserHandle: "<One>", profileUrl: "" },
        { id: "two", user: "two", platformUserHandle: "Two", profileUrl: "" },
        { id: "none", user: "none", platformUserHandle: "No stats", profileUrl: "", status: "private" },
    ]).run();
    const defaults = { deaths: 5, revives: 1, score: 10, timePlayedDisplay: "1h", timePlayedValue: 3600 };
    db.insert(bf6Scrapes).values([
        { ...defaults, playerId: `one&"`, kills: 4, scrapedAt: ago(15) },
        { ...defaults, playerId: `one&"`, kills: 10, scrapedAt: ago(2) },
        { ...defaults, playerId: `one&"`, kills: 11, scrapedAt: ago(1) },
        { ...defaults, playerId: `one&"`, kills: 12, scrapedAt: ago(1) },
        { ...defaults, playerId: "two", kills: 5, wins: 2, losses: 0, scrapedAt: ago(1) },
    ]).run();
    stats = createStatsReader(client);
    stats.checkSchema();
    dashboard = createDashboard(stats, () => now);
});

afterEach(() => client.close());
const request = (path: string, method = "GET") => dashboard(new Request(`http://127.0.0.1:3000${path}`, { method }));

test("leaderboard selects one latest snapshot per player, sorts known rates first and escapes handles", async () => {
    expect(stats.leaderboard()).toHaveLength(3);
    expect(stats.player(`one&"`)?.snapshot.kills).toBe(12);
    expect(stats.player("none")?.snapshot).toBeNull();
    const response = request("/?sort=winRate");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const html = await response.text();
    expect(html.indexOf(">Two</a>")).toBeLessThan(html.indexOf(">&lt;One&gt;</a>"));
    expect(html).not.toContain("<One>");
    expect(html).toContain("100.0%");
    expect(html).toContain("2026-08-14 12:00 UTC");
    expect(html).toContain("(Private)");
});

test("player history filters snapshots and reports change only between observations", async () => {
    const path = `/player?id=${encodeURIComponent(`one&"`)}&metric=kills`;
    const short = await request(`${path}&days=7`).text();
    const long = await request(`${path}&days=30`).text();
    expect(short).toContain("+2");
    expect(short).not.toContain("2026-07-31 12:00 UTC");
    expect(long).toContain("+8");
    expect(long).toContain("2026-07-31 12:00 UTC");
    expect(long).toContain('role="img"');
    expect(long).toContain(">Aug 10</text>");
    expect(long).toContain("4 of 4 snapshots plotted");
    expect(long).toContain('data-chart-point="2026-08-14 12:00 UTC · Human kills: 12 · tracker · +1 since previous snapshot"');
    expect(long).toContain('class="stat-grid"');
    expect(await request("/player?id=none").text()).toContain("No saved snapshots yet.");
    expect((request("/player?id=unknown")).status).toBe(404);
    expect((request("/", "POST")).status).toBe(405);
});

test("chart breaks at gaps, missing values and provider changes without implying zero activity", () => {
    const rows = stats.history(`one&"`, ago(30), now);
    expect(historySeries(rows, "kills").points.map(point => point.connect)).toEqual([false, false, true, true]);
    expect(historySeries(rows, "winRate").change).toBeNull();
    expect(historySeries([{ ...rows[0] }, { ...rows[1], source: "gametools" }], "kills").change).toBeNull();
    expect(historySeries([rows[1], { ...rows[2], kills: 1 }], "kills").change).toBeNull();
    expect(historySeries([rows[0]], "kills").change).toBeNull();
});

test("history updates return only the chart, change, and snapshots for the selected filters", async () => {
    const params = new URLSearchParams({ id: `one&"`, days: "7", metric: "revives" });
    const response = request(`/player/history?${params}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('aria-label="Revives over time"');
    expect(html).toContain("Observed change:");
    expect(html).toContain("Recent snapshots in this range (3 of 3)");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("Lifetime totals");
    expect(request("/player/history?id=unknown").status).toBe(404);
    expect(await request("/history.js").text()).toContain('form.addEventListener("change"');
});

test("dashboard select forms auto-submit, while player history keeps its in-place update", async () => {
    drizzle(client).insert(bf6ItemSnapshots).values({
        playerId: "two", itemKey: "bradley", kills: 5, timePlayedValue: 3600, timePlayedDisplay: "1h",
    }).run();
    for (const [path, action] of [
        ["/recent", "/recent"], ["/compare", "/compare"], ["/monthly", "/monthly"],
        ["/activity", "/activity"], ["/gear?category=vehicle", "/gear"],
    ]) {
        const html = await request(path).text();
        expect(html).toContain(`<form action="${action}" data-auto-submit>`);
        expect(html).toContain('<button type="submit">');
    }
    expect(await request(`/player?id=${encodeURIComponent(`one&"`)}`).text()).toContain('<form action="/player#history">');
    expect(await request("/history.js").text()).toContain("filter.requestSubmit()");
});

test("player page shows saved combat and teamplay history plus the latest gear for that player", async () => {
    const playerId = `one&"`;
    const db = drizzle(client);
    const time = { playerId, timePlayedDisplay: "1h", timePlayedValue: 3600, scrapedAt: ago(1) };
    db.update(bf6Scrapes).set({ shotsHit: 75, shotsFired: 300, repairs: 42 }).run();
    db.insert(bf6WeaponPlaystyles).values({
        ...time, weaponName: "M4 <test>", kills: 8, adsKills: 6, hipfireKills: 2, headshots: 1,
        shotsHit: 12, shotsFired: 48, adsPct: 7500, hipfirePct: 2500, headshotPct: 1250, accuracyPct: 2500,
    }).run();
    db.insert(bf6ClassSnapshots).values({
        ...time, classKey: "kit_support", className: "Support", kills: 8, deaths: 4,
        assists: 3, revives: 12, deployments: 2, kdRatio: 200,
    }).run();
    db.insert(bf6ItemSnapshots).values([
        { ...time, itemKey: "bradley", kills: 8 },
        { ...time, itemKey: "frag", kills: 7 },
        { ...time, itemKey: "other-item", kills: 6 },
        { ...time, playerId: "two", itemKey: "hidden-item", kills: 5 },
    ]).run();
    const html = await request(`/player?id=${encodeURIComponent(playerId)}&metric=accuracy&days=365`).text();
    expect(html).toContain('value="365" selected');
    expect(html).toContain('value="accuracy" selected');
    expect(html).toContain("<dt>Repairs</dt><dd>42</dd>");
    expect(html).toContain("Recent snapshots in this range (4 of 4)");
    expect(html).toContain("M4 &lt;test&gt;");
    expect(html).toContain("25.0% (12 / 48)");
    expect(html).toContain("<td>Support</td>");
    expect(html).toContain("M3A3 Bradley");
    const vehicleTable = html.split("<h3>Vehicles</h3>")[1].split("<h3>Gadgets</h3>")[0];
    expect(vehicleTable).toContain('data-sort-column="text">Vehicle</button>');
    expect(vehicleTable).toContain('aria-sort="descending"><button type="button" data-sort-column="number">Kills</button>');
    expect(vehicleTable).toContain('data-sort-column="number">Playtime</button>');
    expect(vehicleTable).toContain('data-sort-column="number">Last saved</button>');
    expect(vehicleTable).toContain('data-sort-value="3600">1h</td>');
    expect(html).toContain("Frag Grenade");
    expect(html).toContain("other-item");
    expect(html).not.toContain("hidden-item");
    const ranking = await request("/gear?category=vehicle&item=bradley").text();
    expect(ranking).toContain("<h2>M3A3 Bradley</h2>");
    expect(ranking).toContain('<td data-sort-value="8">8</td>');
    expect(ranking).toContain("&lt;One&gt;</a>");
    expect(ranking).not.toContain("Frag Grenade");
    expect(await request("/gear?category=weapon").text()).toContain("<h2>M4 &lt;test&gt;</h2>");
    expect(await request("/gear?category=class").text()).toContain("<h2>Support</h2>");
});

test("monthly rankings subtract the previous snapshot without treating first observations as gains", async () => {
    const month = monthlyProgress(stats, "2026-08", now);
    expect(month[0]).toMatchObject({ id: `one&"`, kills: 8, deaths: 0, kd: null, note: "Comparable" });
    expect(month.find(row => row.id === "two")).toMatchObject({ kills: null, note: "No prior baseline" });
    expect(month.find(row => row.id === "none")).toMatchObject({ kills: null, note: "No snapshot this month" });
    expect((await request("/monthly?month=2026-07").text())).toContain('value="2026-07" selected');
    expect((await request("/monthly").text())).toContain("1 of 3 players have comparable snapshots.");
    drizzle(client).update(bf6Scrapes).set({ source: "gametools" }).where(eq(bf6Scrapes.kills, 11)).run();
    expect(monthlyProgress(stats, "2026-08", now).find(row => row.id === `one&"`)).toMatchObject({
        kills: null, note: "Provider change or counter reset",
    });
});

test("group activity estimates weekday hours and records from accepted playtime deltas", async () => {
    drizzle(client).insert(bf6Scrapes).values({
        playerId: "two", kills: 5, deaths: 5, revives: 1, score: 10,
        timePlayedValue: 7200, timePlayedDisplay: "2h", scrapedAt: now,
    }).run();
    const activity = groupActivity(stats, 7, now);
    expect(activity.records.month.hours).toMatchObject({ key: "2026-08", seconds: 3600, uniquePlayers: 1 });
    expect(activity.records.day.players?.uniquePlayers).toBe(1);
    const html = await request("/activity?days=7").text();
    expect(html).toContain("Coverage:");
    expect(html).toContain("Activity by weekday");
    expect(html).toContain("Activity records");
    expect(await request("/activity?days=all").text()).toContain('value="all" selected');
});

test("player identity shows saved aliases and valid links, with rates computed from stored stats", async () => {
    const db = drizzle(client);
    const playerId = `one&"`;
    db.update(bf6Players).set({ profileUrl: "https://tracker.example/profile?a=1&b=2" }).where(eq(bf6Players.id, playerId)).run();
    db.update(bf6Players).set({ profileUrl: "javascript:alert(1)" }).where(eq(bf6Players.id, "two")).run();
    db.insert(bf6PlayerAliases).values({
        playerId, namespace: "steam", handle: "<old handle>", normalizedHandle: "old handle", source: "steam",
        firstSeenAt: ago(8), lastSeenAt: ago(3),
    }).run();
    db.update(bf6Scrapes).set({ aiKills: 12, damage: 600 }).where(eq(bf6Scrapes.kills, 12)).run();
    const html = await request(`/player?id=${encodeURIComponent(playerId)}`).text();
    expect(html).toContain('href="https://tracker.example/profile?a=1&amp;b=2"');
    expect(html).toContain("&lt;old handle&gt;");
    expect(html).toContain("2026-08-07 12:00 UTC");
    expect(html).toContain("<dt>Human + AI kills</dt><dd>24</dd>");
    expect(html).toContain("<dt>AI kill share</dt><dd>50.0%</dd>");
    expect(html).toContain("<dt>Human kills/min</dt><dd>0.20</dd>");
    expect(html).toContain("<dt>Damage/min</dt><dd>10.00</dd>");
    expect(await request("/player?id=two").text()).not.toContain("javascript:");
});

test("recent gains and comparison use in-range snapshots and show missing or partial coverage", async () => {
    const id = `one&"`;
    const statsRow = recentProgress(stats, 7, now).rows.find(row => row.id === id);
    expect(statsRow).toMatchObject({ kills: 2, deaths: 0, kd: null, snapshots: 3, longestGap: dayMs, span: 1 / 7 });
    expect(recentProgress(stats, 7, now).rows.find(row => row.id === "two")).toMatchObject({ kills: null, snapshots: 1 });
    const ranking = await request("/recent?days=7").text();
    expect(ranking).toContain("Human kills gained");
    expect(ranking).toContain('>14%</td>');
    const params = new URLSearchParams({ first: id, second: "two", days: "7" });
    const comparison = await request(`/compare?${params}`).text();
    expect(comparison).toContain("<th scope=\"row\">Human kills gained</th><td>2</td><td>—</td>");
    expect(comparison).toContain("Longest gap between snapshots");
    expect(comparison).toContain("<h2>Snapshot coverage</h2>");
    expect(comparison).toContain("<h2>Performance in this range</h2>");
    expect(comparison).toContain('<progress class="compare-bar" value="2" max="2"');
    expect(comparison).toContain("<summary>Show detailed comparison table</summary>");
    params.set("second", id);
    expect(await request(`/compare?${params}`).text()).toContain("Choose two different players");
    drizzle(client).update(bf6Scrapes).set({ source: "gametools" }).where(eq(bf6Scrapes.kills, 11)).run();
    expect(recentProgress(stats, 7, now, [id]).rows[0].kills).toBeNull();
});

test("personal bests exclude the current month and months without a comparable baseline", async () => {
    const id = `one&"`;
    const db = drizzle(client);
    db.update(bf6Scrapes).set({ revives: 4, timePlayedValue: 10800 }).where(eq(bf6Scrapes.kills, 12)).run();
    expect(personalBests(stats, id, now)).toEqual({ kills: null, revives: null, playtime: null });
    const september = new Date("2026-09-05T12:00:00Z");
    expect(personalBests(stats, id, september)).toEqual({
        kills: { month: "2026-08", value: 8 },
        revives: { month: "2026-08", value: 3 },
        playtime: { month: "2026-08", value: 7200 },
    });
    const response = createDashboard(stats, () => september)(new Request(`http://127.0.0.1:3000/player?id=${encodeURIComponent(id)}`));
    const html = await response.text();
    expect(html).toContain("Personal bests");
    expect(html).toContain('href="/monthly?month=2026-08"');
    db.update(bf6Scrapes).set({ kills: 1 }).where(eq(bf6Scrapes.kills, 11)).run();
    expect(personalBests(stats, id, september).kills).toBeNull();
});

test("comparison explains a provider switch and can use a common post-switch cutoff", async () => {
    const id = `one&"`;
    const db = drizzle(client);
    const defaults = { deaths: 5, revives: 1, score: 10, timePlayedDisplay: "1h", timePlayedValue: 3600 };
    db.insert(bf6Scrapes).values([
        { ...defaults, playerId: "two", kills: 4, scrapedAt: ago(3) },
        { ...defaults, playerId: "two", kills: 15, scrapedAt: ago(1), source: "gametools" },
        { ...defaults, playerId: "two", kills: 20, scrapedAt: now, source: "gametools" },
        { ...defaults, playerId: id, kills: 17, scrapedAt: now, source: "gametools" },
    ]).run();
    db.update(bf6Scrapes).set({ source: "gametools" }).where(eq(bf6Scrapes.kills, 10)).run();
    db.update(bf6Scrapes).set({ source: "gametools" }).where(eq(bf6Scrapes.kills, 11)).run();
    db.update(bf6Scrapes).set({ source: "gametools" }).where(eq(bf6Scrapes.kills, 12)).run();
    const params = new URLSearchParams({ first: id, second: "two", days: "30" });
    const full = await request(`/compare?${params}`).text();
    expect(full).toContain("Provider changed on 2026-08-14 12:00 UTC");
    expect(full).toContain("Tracker → GameTools");
    expect(full).toContain("Compare after provider switch");
    expect(full).toContain('<th scope="row">Human kills gained</th><td>—</td><td>—</td>');
    params.set("afterSwitch", "1");
    const filtered = await request(`/compare?${params}`).text();
    expect(filtered).toContain("Effective range: 2026-08-14 12:00 UTC");
    expect(filtered).toContain("Show full range");
    expect(filtered).toContain('<th scope="row">Human kills gained</th><td>6</td><td>5</td>');
});
