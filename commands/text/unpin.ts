import { defineCommand } from "..";
import { Message, TextChannel } from "discord.js";
import { db } from "../../db";
import { pins } from "../../db/schema";
import { and, eq } from "drizzle-orm";

export default defineCommand({
    name: "unpin",
    description: "Unpin a link. Usage: unpin <url>",
    type: "TEXT",
    permissions: [],

    async execute(msg: Message, args: string[]) {
        if (!msg.guildId) {
            await msg.reply("This command can only be used in a server.");
            return;
        }


        const url = args[0];
        const descriptionRaw = args.slice(1).join(" ");

        // Extract tags
        const tagsMatches = descriptionRaw.match(/#[a-zA-Z0-9_]+/g);
        const tagsList = tagsMatches ? tagsMatches.map(t => t.slice(1)) : [];
        const tags = tagsList.join(",");


        // maybe check if the pin exists, and with the id delete it

        try {
            await db.update(pins)
                .set({ isArchived: true })
                .where(and(eq(pins.url, url), (eq(pins.serverId, msg.guildId))));



            await msg.reply("deleted");
        } catch (e) {
            console.error(e);
            await msg.reply("Failed to delete.");
        }
    }
});
