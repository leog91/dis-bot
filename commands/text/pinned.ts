import { defineCommand } from "..";
import { Message } from "discord.js";
import { db } from "../../db";
import { pins } from "../../db/schema";
import { eq, and, like, desc } from 'drizzle-orm';

export default defineCommand({
    name: "pinned",
    description: "List pinned links",
    type: "TEXT",
    permissions: [],

    async execute(msg: Message, args: string[]) {
        if (!msg.guildId) {
            await msg.reply("This command can only be used in a server.");
            return;
        }

        const tagFilter = args[0] ? args[0].replace('#', '') : null;

        try {
            const conditions = [
                eq(pins.serverId, msg.guildId),
                eq(pins.isArchived, false),
            ];

            if (tagFilter) {
                conditions.push(like(pins.tags, `%${tagFilter}%`));
            }

            const results = await db.select()
                .from(pins)
                .where(and(...conditions))
                .orderBy(desc(pins.createdAt))
                .limit(15);

            if (results.length === 0) {
                await msg.reply(tagFilter ? `No pins found for #${tagFilter}.` : "No pins found.");
                return;
            }

            // Group by formatted string
            const lines = results.map(p => {
                // If there's a description, display it, otherwise just the URL
                if (p.description) {
                    const title = p.description.length > 50 ? p.description.substring(0, 50) + "..." : p.description;

                    return `[${title}](<${p.url}>)`

                }

                return `<${p.url}>`;
            });

            await msg.reply(lines.join("\n"));

        } catch (e) {
            console.error(e);
            await msg.reply("Failed to retrieve pins.");
        }
    }
});
