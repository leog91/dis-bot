import { Message } from "discord.js";
import { Command, defineCommand, hasPermission } from "..";

export default defineCommand({
    name: "aiuda",
    description: " commands",
    type: "TEXT",

    async execute(msg: Message, _args: string[]) {
        const commandsMap: Map<string, Command> = msg.client.commands;
        const visibleCommands: string[] = [];

        for (const cmd of commandsMap.values()) {

            if (cmd.hidden) continue;

            const allowed = await hasPermission(cmd, msg);
            if (allowed) visibleCommands.push(`• **${cmd.name}** — ${cmd.description}`);
        }

        if (visibleCommands.length === 0) {
            await msg.reply("❌ No commands available for you in this server.");
            return; // <-- now this returns void, safe!
        }

        await msg.reply({
            content: `📜 **Available Commands:**\n\n${visibleCommands.join("\n")}`
        });

        return; // optional but clarifies `void`
    }
});