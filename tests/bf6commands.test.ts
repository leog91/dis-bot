import { describe, expect, it } from "bun:test";
import { SUBCOMMANDS, SUBCOMMANDS_HELP, resolveSubcommand } from "../utils/bf6commands/constants";
import { buildIntggProfileUrl, formatFullKillsLeaderboard, formatKillsLeaderboard, formatLeaderboardTable, formatProgressValue, formatStatPercent, formatStatRate, formatStatRatio } from "../utils/bf6commands/format";

describe("BF6 command help", () => {
    it("lists every canonical subcommand exactly once", () => {
        for (const command of SUBCOMMANDS) {
            const token = `\`${command}\``;
            expect(SUBCOMMANDS_HELP.split(token)).toHaveLength(2);
        }

        const listedCommands = [...SUBCOMMANDS_HELP.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
        expect(listedCommands).toHaveLength(SUBCOMMANDS.length);
    });

    it("fits in a Discord message with either response prefix", () => {
        expect(`Te falta el subcommand máquina:\n\n${SUBCOMMANDS_HELP}`.length).toBeLessThanOrEqual(2000);
        expect(`Unknown subcommand. Available:\n\n${SUBCOMMANDS_HELP}`.length).toBeLessThanOrEqual(2000);
    });
});

describe("BF6 player cards", () => {
    it("resolves player-card aliases and moves nicks to alias history", () => {
        expect(resolveSubcommand("profile")).toBe("stats");
        expect(resolveSubcommand("teamwork")).toBe("teamplay");
        expect(resolveSubcommand("bots")).toBe("ai");
        expect(resolveSubcommand("nicks")).toBe("aliases");
        expect(resolveSubcommand("social")).toBe("social");
        expect(resolveSubcommand("trackergg")).toBe("social");
        expect(resolveSubcommand("tracker")).toBe("social");
    });

    it("formats derived metrics without inventing unavailable values", () => {
        expect(formatStatRatio(10, 4)).toBe("2.50");
        expect(formatStatRatio(10, 0)).toBe("inf");
        expect(formatStatRatio(0, 0)).toBe("0.00");
        expect(formatStatPercent(8, 10)).toBe("80.00%");
        expect(formatStatPercent(null, 10)).toBe("-");
        expect(formatStatPercent(0, 0)).toBe("0.00%");
        expect(formatStatRate(60, 3600)).toBe("1.00");
        expect(formatStatRate(null, 3600)).toBe("-");
        expect(formatStatRate(10, 0)).toBe("-");
    });

    it("builds INT.GG profile links from the current handle and configured id", () => {
        expect(buildIntggProfileUrl("Example Player Name", "40001"))
            .toBe("https://int.gg/bf6/player/Example%20Player%20Name-40001");
    });
});

describe("BF6 leaderboard tables", () => {
    it("aligns numeric stats, ranks and full playtime values", () => {
        for (const [title, label, values] of [
            ["Deaths", "deaths", ["+100", "-5"]],
            ["Revives", "revives", ["+20", "+0"]],
            ["Score", "score", ["123456789", "0"]],
            ["Rank", "rank", ["100", "—"]],
            ["Playtime", "time", ["12345h 30m", "1h 0m"]],
        ] as const) {
            const players = values.map((value, index) => ({
                platformUserHandle: `Player${index}`, status: "active", value,
            }));
            const content = formatLeaderboardTable(players, title, label, (p) => p.value);
            expect(content).toStartWith(` **${title}**\n\`\`\`text\n`);
            const lines = content.split("```text\n")[1].split("\n```")[0].split("\n");
            expect(new Set(lines.map((line) => line.indexOf(" | ", 5))).size).toBe(1);
            expect(lines[1].split(" | ")[2].trim()).toBe(values[0]);
            expect(lines[2].split(" | ")[2].trim()).toBe(values[1]);
            expect(new Set(lines.map((line) => line.length)).size).toBe(1);
        }
    });

    it("formats signed progress without changing current totals", () => {
        expect(formatProgressValue(100, false)).toBe("100");
        expect(formatProgressValue(100, true)).toBe("+100");
        expect(formatProgressValue(0, true)).toBe("+0");
        expect(formatProgressValue(-5, true)).toBe("-5");
    });
});

describe("BF6 kills leaderboard", () => {
    it("renders a sorted table with status markers without mutating players", () => {
        const players = [
            { platformUserHandle: "First", status: "active", kills: 10 },
            { platformUserHandle: "Second", status: "private", kills: 200 },
        ];
        const content = formatKillsLeaderboard(players);
        expect(content).toStartWith(" **Kills**\n```text\n");
        const rows = content.split("```text\n")[1].split("\n```")[0].split("\n");
        expect(rows.map((row) => row.split(" | ").map((value) => value.trim()))).toEqual([
            ["#", "player", "kills"],
            ["1", "Second 🔒", "200"],
            ["2", "First", "10"],
        ]);
        expect(content).toContain("1 private");
        expect(players[0].platformUserHandle).toBe("First");
    });

    it("preserves progress values including zero and negative changes", () => {
        const content = formatKillsLeaderboard([10, 0, -5].map((kills) => ({
            platformUserHandle: "Player", status: "active", kills,
        })), true);
        expect(content).toContain("+10");
        expect(content).toContain("+0");
        expect(content).toContain("-5");
        expect(content).not.toContain("+-5");
    });

    it("handles no players and limits the table to 20", () => {
        expect(formatKillsLeaderboard([])).toBe("");
        const content = formatKillsLeaderboard(Array.from({ length: 21 }, (_, kills) => ({
            platformUserHandle: `Player${kills}`, status: "active", kills,
        })));
        expect(content).toContain("...showing top 20/21 players");
        expect(content).not.toMatch(/Player0\s/);
    });
});

describe("BF6 full kills leaderboard", () => {
    it("resolves the kills-full subcommand", () => {
        expect(resolveSubcommand("KILLS-FULL")).toBe("kills-full");
    });

    it("shows humans, bots and totals sorted by total kills without mutating input", () => {
        const players = [
            { platformUserHandle: "Human", status: "active", kills: 100, aiKills: 0 },
            { platformUserHandle: "Mixed", status: "inactive", kills: 50, aiKills: 150 },
            { platformUserHandle: "Unknown", status: "active", kills: 500, aiKills: null },
        ];
        const content = formatFullKillsLeaderboard(players);
        expect(content).toStartWith(" **Kills** (total)\n```text\n");
        const lines = content.split("```text\n")[1].split("\n```")[0].split("\n");
        expect(lines.map((line) => line.split(" | ").map((value) => value.trim()))).toEqual([
            ["#", "player", "human", "bots", "total", "bot %"],
            ["1", "Mixed ⚠️", "50", "150", "200", "75.00%"],
            ["2", "Human", "100", "0", "100", "0.00%"],
            ["3", "Unknown", "500", "N/A", "N/A", "N/A"],
        ]);
        expect(new Set(lines.map((line) => line.length)).size).toBe(1);
        expect(content).toEndWith("\n*1 inactive/not found*");
        expect(players[0].platformUserHandle).toBe("Human");
    });

    it("returns empty content when there are no players", () => {
        expect(formatFullKillsLeaderboard([])).toBe("");
    });

    it("shows zero percent when total kills are zero", () => {
        expect(formatFullKillsLeaderboard([
            { platformUserHandle: "New", status: "active", kills: 0, aiKills: 0 },
        ])).toContain("0.00%");
    });

    it("limits the table to the top 20 and includes status notes", () => {
        const content = formatFullKillsLeaderboard(Array.from({ length: 21 }, (_, index) => ({
            platformUserHandle: `Player${index}`,
            status: "private",
            kills: index,
            aiKills: 0,
        })));
        expect(content).toContain("...showing top 20/21 players");
        expect(content).toContain("21 private");
        expect(content).not.toMatch(/Player0\s/);
        expect(content.length).toBeLessThanOrEqual(2000);
    });
});
