// commands/text/ig.ts

import { Message, TextChannel } from "discord.js";
import { defineCommand } from "..";

declare const Bun: any;

export default defineCommand({
    name: "vid",
    description: "ig/tw",
    type: "TEXT",
    hidden: false,
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

        try {
            new URL(url);
        } catch {
            await msg.reply("no es válida master");
            return;
        }

        try {

            const process = Bun.spawn([
                "yt-dlp",
                "-f", "b",   // best pre-merged format (suppresses the first warning)
                "-g",
                "--no-warnings", // suppress yt-dlp warnings entirely
                url
            ]);
            const stdoutText = await new Response(process.stdout).text();
            const stderrText = await new Response(process.stderr).text();

            if (!stdoutText) {
                console.error(stderrText);
                await msg.reply("Failed to extract video URL.");
                return;
            }

            const directUrl = stdoutText.trim();

            // Shorten with is.gd
            const shortRes = await fetch(
                `https://is.gd/create.php?format=simple&url=${encodeURIComponent(directUrl)}`
            );
            const shortUrl = await shortRes.text();

            // Delete original command
            if (msg.deletable) await msg.delete();

            await msg.channel.send(
                `by ${msg.author}:`
            );

            // Send shortened URL
            await msg.channel.send(shortUrl);

        } catch (err) {
            console.error(err);
            await msg.reply("An error occurred while processing the video.");
        }
    }
});
