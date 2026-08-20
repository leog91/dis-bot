import { describe, expect, it } from "bun:test";
import { SUBCOMMANDS, SUBCOMMANDS_HELP } from "../utils/bf6commands/constants";

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
