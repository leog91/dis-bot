// commands/text/ig.ts

import { Message, TextChannel } from "discord.js";
import { defineCommand } from "..";
import { useVoice } from "../../voice";

declare const Bun: any;

const runYtDlpGetUrl = async (url: string, extractorArg?: string) => {
    const cmd = [
        "yt-dlp",
        "-f", "b",
        "-g",
        "--no-warnings",
        "--extractor-retries", "3",
    ];

    if (extractorArg) {
        cmd.push("--extractor-args", extractorArg);
    }

    cmd.push(url);

    const process = Bun.spawn(cmd);
    const [stdoutText, stderrText, exitCode] = await Promise.all([
        new Response(process.stdout).text(),
        new Response(process.stderr).text(),
        process.exited,
    ]);

    return {
        stdoutText: stdoutText.trim(),
        stderrText: stderrText.trim(),
        exitCode,
    };
};

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


        if (msg.guild && msg.member?.voice.channelId) {
            const voice = useVoice(msg.guild.id);
            const userChannelId = msg.member.voice.channelId;
            const botChannelId = voice.connection?.joinConfig.channelId;

            if (botChannelId && botChannelId === userChannelId) {
                try {
                    await voice.playRandomNoRepeat(msg, "bot/task-acknowledged");
                } catch (err) {
                    console.error("Failed to play task acknowledgment audio:", err);
                }
            }
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
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase();
            const isTwitterLike = host.includes("twitter.com") || host.includes("x.com");

            const attempts: Array<string | undefined> = isTwitterLike
                ? [undefined, "twitter:api=legacy", "twitter:api=syndication"]
                : [undefined];

            let directUrl = "";
            let lastError = "";

            for (const extractorArg of attempts) {
                const result = await runYtDlpGetUrl(url, extractorArg);
                if (result.stdoutText) {
                    directUrl = result.stdoutText;
                    break;
                }
                lastError = result.stderrText || `yt-dlp exited with code ${result.exitCode}`;
            }

            if (!directUrl) {
                console.error(lastError);
                // Fallback: keep processing by shortening the original URL.
                directUrl = url;
            }

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
