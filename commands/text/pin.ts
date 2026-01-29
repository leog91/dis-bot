import { defineCommand } from "..";
import { Message, TextChannel } from "discord.js";
import { db } from "../../db";
import { pins } from "../../db/schema";

export default defineCommand({
    name: "pin",
    description: "Pin a link with description and tags",
    type: "TEXT",
    permissions: [],

    async execute(msg: Message, args: string[]) {
        if (!msg.guildId) {
            await msg.reply("This command can only be used in a server.");
            return;
        }

        if (args.length < 2) {
            await msg.reply("Usage: pin <url> <description> #tags");
            return;
        }

        const url = args[0];
        const descriptionRaw = args.slice(1).join(" ");

        // Extract tags
        const tagsMatches = descriptionRaw.match(/#[a-zA-Z0-9_]+/g);
        const tagsList = tagsMatches ? tagsMatches.map(t => t.slice(1)) : [];
        const tags = tagsList.join(",");

        try {
            await db.insert(pins).values({
                serverId: msg.guildId,
                url: url,
                description: descriptionRaw,
                tags: tags,
                userId: msg.author.id
            });
            await msg.reply("📌 Pinned!");
        } catch (e) {
            console.error(e);
            await msg.reply("Failed to pin.");
        }
    }
});
