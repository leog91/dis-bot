import { Message, TextChannel } from "discord.js";
import { defineCommand } from "..";


export default defineCommand({
    name: "shorten",
    description: "Shorten a URL",
    type: "TEXT",
    permissions: [],
    execute: async (msg: Message) => {
        if (!(msg.channel instanceof TextChannel)) {
            await msg.reply("This command can only be used in a text channel.");
            return;
        }

        const args = msg.content.split(" ").slice(1);
        const url = args[0];

        if (!url) {
            await msg.reply("y la url?");
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            await msg.reply("no es válida master");
            return;
        }

        try {
            const response = await fetch(
                `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`
            );

            const shortUrl = await response.text();


            await msg.delete();


            await msg.channel.send(
                `by ${msg.author}:`
            );
            await msg.channel.send(shortUrl);


        } catch (err) {
            console.error(err);
            await msg.reply("Failed to shorten the URL. Please try again later.");
        }
    }
});
