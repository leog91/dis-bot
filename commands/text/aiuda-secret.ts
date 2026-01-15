import { Message } from "discord.js";
import { Command, defineCommand, hasPermission } from "..";

export default defineCommand({
    name: "aiuda-secret",
    description: "Private commands ",
    type: "TEXT",

    async execute(msg: Message) {
        const commandsMap: Map<string, Command> = msg.client.commands;
        const visibleCommands: string[] = [];
        const guildId = msg.guild!.id;

        for (const cmd of commandsMap.values()) {
            // 1. Skip hidden commands
            // if (cmd.hidden) continue;

            // 2. Skip public commands (no guild permissions)
            const guildPerms = cmd.permissions?.filter(
                p => p.type === "GUILD"
            );

            if (!guildPerms || guildPerms.length === 0) continue;

            // 3. Check if this command is allowed in THIS guild
            const allowedInGuild = guildPerms.some(p =>
                p.ids.includes(guildId)
            );

            if (!allowedInGuild) continue;

            // 4. Final permission check (roles, owners, etc.)
            const allowed = await hasPermission(cmd, msg);
            if (!allowed) continue;

            visibleCommands.push(
                `• **${cmd.name}** — ${cmd.description}`
            );
        }

        if (visibleCommands.length === 0) {
            await msg.reply("❌ No private commands available in this server.");
            return;
        }

        await msg.reply({
            content: `🔒 **Private Commands :**\n\n${visibleCommands.join("\n")}`
        });
    }
});