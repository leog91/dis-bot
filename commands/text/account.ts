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

function formatCredentials(game: ResolvedGame): string {
    const lines: string[] = [
        `🔐 **${game.title} account details**`,
        "",
    ];

    if (game.credentials.email) lines.push(`**Email:** ${game.credentials.email}`);
    if (game.credentials.username) lines.push(`**Username:** ${game.credentials.username}`);
    if (game.credentials.password) lines.push(`**Password:** ${game.credentials.password}`);

    for (const line of game.credentials.lines ?? []) {
        lines.push(line);
    }

    for (const line of game.credentials.extra ?? []) {
        lines.push(line);
    }

    lines.push("");
    lines.push("Keep these details private and do not post them in the server.");

    return lines.join("\n");
}

export default defineCommand({
    name: "account",
    description: "Send purchased game account details by DM",
    type: "TEXT",

    async execute(msg: Message, args: string[]) {
        const server = msg.guild?.name || "DM";
        const gameQuery = extractGameQuery(args);

        if (!gameQuery) {
            await msg.reply("Usage: `account game:<game_name>`");
            return;
        }

        if (!gameAccessService.isConfigured()) {
            await msg.reply("⚠️ Account delivery is not configured yet. Ask an admin to set it up.");
            logger(server, `Account config missing when requested by ${msg.author.tag}`, "ERROR");
            return;
        }

        let game: ResolvedGame | null = null;

        try {
            game = gameAccessService.findGame(gameQuery);
        } catch (error) {
            await msg.reply("⚠️ I couldn't read the private account store. Ask an admin to check the bot config.");
            logger(server, `Failed to read account config: ${error}`, "ERROR");
            return;
        }

        if (!game) {
            await msg.reply(`❌ I couldn't find a game matching "${gameQuery}".`);
            return;
        }

        if (!gameAccessService.hasAccess(msg.author.id, game)) {
            await msg.reply(`❌ No purchase access found for **${game.title}**.`);
            logger(server, `Unauthorized account request for ${game.key} by ${msg.author.tag}`, "INFO");
            return;
        }

        try {
            await msg.author.send(formatCredentials(game));
            await msg.reply(`📩 I sent your **${game.title}** account details by DM.`);
            logger(server, `Delivered account details for ${game.key} to ${msg.author.tag}`, "INFO");
        } catch (error) {
            await msg.reply("⚠️ I couldn't DM you. Enable direct messages from server members, then try again.");
            logger(server, `DM delivery failed for ${game.key} to ${msg.author.tag}: ${error}`, "ERROR");
        }
    },
});
