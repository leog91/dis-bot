import { Message, TextChannel } from "discord.js";
import { defineCommand } from "..";

const validateShortenedUrl = async (shortUrl: string): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(shortUrl, {
            method: "HEAD",
            signal: controller.signal,
            redirect: "follow",
        });
        clearTimeout(timeout);
        return res.ok || (res.status >= 300 && res.status < 400);
    } catch {
        return false;
    }
};

const tryShorten = async (apiUrl: string, expectedHostname: string, url: string): Promise<string | null> => {
    try {
        const res = await fetch(apiUrl);
        const text = (await res.text()).trim();

        if (text && text.toLowerCase().startsWith("http")) {
            const parsed = new URL(text);
            if (parsed.hostname === expectedHostname && text.length < url.length) {
                const isValid = await validateShortenedUrl(text);
                if (isValid) return text;
            }
        }
    } catch (err) {
        console.error(`Failed to shorten URL with ${expectedHostname}:`, err);
    }
    return null;
};

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

        try {
            new URL(url);
        } catch {
            await msg.reply("no es válida master");
            return;
        }

        try {
            const isGd = await tryShorten(
                `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
                "is.gd",
                url
            );
            const output = isGd ?? await tryShorten(
                `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
                "tinyurl.com",
                url
            ) ?? url;

            await msg.delete();
            await msg.channel.send(`by ${msg.author}:`);
            await msg.channel.send(output);
        } catch (err) {
            console.error(err);
            await msg.channel.send(`by ${msg.author}:`);
            await msg.channel.send(url);
        }
    }
});
