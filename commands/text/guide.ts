import { Message } from "discord.js";
import { defineCommand } from "..";
import { gameAccessService, ResolvedGame } from "../../services/gameAccess.service";
import { logger } from "../../utils/logger";

function extractGameQuery(args: string[]): string {
    const raw = args.join(" ").trim();
    if (!raw) return "";

    const match = raw.match(/^game\s*[:=]\s*(.+)$/i);
    const query = match ? match[1] : raw;

    return query.replace(/^["']|["']$/g, "").trim();
}

function pushSection(lines: string[], title: string, values?: string[]) {
    if (!values || values.length === 0) return;

    lines.push(`**${title}**`);
    values.forEach((value, index) => lines.push(`${index + 1}. ${value}`));
    lines.push("");
}

function formatGuide(game: ResolvedGame): string {
    const lines: string[] = [`🛠️ **${game.title} guide**`, ""];

    if (game.guide.summary) {
        lines.push(game.guide.summary);
        lines.push("");
    }

    if (game.guide.launcher) {
        lines.push(`**Launcher:** ${game.guide.launcher}`);
        lines.push("");
    }

    pushSection(lines, "Setup Steps", game.guide.steps);
    pushSection(lines, "Login Instructions", game.guide.loginInstructions);
    pushSection(lines, "Recommended Settings", game.guide.recommendedSettings);
    pushSection(lines, "Troubleshooting", game.guide.troubleshooting);

    if (game.guide.notes && game.guide.notes.length > 0) {
        lines.push("**Notes**");
        game.guide.notes.forEach((note) => lines.push(`- ${note}`));
    }

    return lines.join("\n").trim();
}

export default defineCommand({
    name: "guide",
    description: "Show setup instructions for a game",
    type: "TEXT",

    async execute(msg: Message, args: string[]) {
        const server = msg.guild?.name || "DM";
        const gameQuery = extractGameQuery(args);

        if (!gameQuery) {
            await msg.reply("Usage: `guide game:<game_name>`");
            return;
        }

        if (!gameAccessService.isConfigured()) {
            await msg.reply("⚠️ Guides are not configured yet. Ask an admin to set them up.");
            logger(server, `Guide config missing when requested by ${msg.author.tag}`, "ERROR");
            return;
        }

        try {
            const game = gameAccessService.findGame(gameQuery);

            if (!game) {
                await msg.reply(`❌ I couldn't find a game matching "${gameQuery}".`);
                return;
            }

            if (!gameAccessService.hasAccess(msg.author.id, game)) {
                await msg.reply(`❌ No purchase access found for **${game.title}**.`);
                logger(server, `Unauthorized guide request for ${game.key} by ${msg.author.tag}`, "INFO");
                return;
            }

            await msg.reply(formatGuide(game));
        } catch (error) {
            await msg.reply("⚠️ I couldn't read the private guide store. Ask an admin to check the bot config.");
            logger(server, `Failed to read guide config: ${error}`, "ERROR");
        }
    },
});
