import { Message } from "discord.js";
import { hasPermission } from "../commands";
import { logger } from "../utils/logger";

export default async function onMessage(msg: Message, commands: Map<string, any>) {
    if (msg.author.bot) return;


    const prefix = "";

    if (!msg.content.startsWith(prefix)) return;

    const [commandName, ...args] = msg.content.slice(prefix.length).trim().split(/\s+/);
    const cmd = commands.get(commandName);
    if (!cmd) return;


    const server = msg.guild?.name || "DM";


    try {
        if (!(await hasPermission(cmd, msg))) {
            await msg.react("❌");
            logger(server, `Permission denied: ${msg.author.tag} tried to run ${cmd.name}`, "INFO");
            return;
        }

        await cmd.execute(msg, args);
        logger(server, `Executed command: ${cmd.name} by ${msg.author.tag}`, "INFO");
    } catch (err) {

        logger(server, `Error executing ${cmd.name} by ${msg.author.tag}: ${err}`, "ERROR");
        try {
            await msg.reply("⚠️ Error executing command.");
        } catch (replyError) {
            logger(server, `Failed to send error reply for ${cmd.name}: ${replyError}`, "ERROR");
        }
    }
}
