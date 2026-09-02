import { describe, expect, it } from "bun:test";
import { SUBCOMMANDS, SUBCOMMANDS_HELP, resolveSubcommand } from "../utils/bf6commands/constants";
import { formatStatPercent, formatStatRate, formatStatRatio } from "../utils/bf6commands/format";

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
        expect(resolveSubcommand("tracker")).toBe("trackergg");
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
});
