import { Message } from "discord.js";
import { defineCommand } from "..";

export default defineCommand({
    name: "forward",
    description: "Relay a message or image anonymously and delete the original",
    type: "TEXT",
    permissions: [],

    async execute(msg: Message, args: string[]) {
        const content = args.join(" ") || undefined;
        const files = msg.attachments.map(a => a.url);

        if (!content && files.length === 0) {
            await msg.reply("You need to provide a message or attach an image to forward.");
            return;
        }

        if (!("send" in msg.channel)) {
            await msg.reply("Cannot forward in this channel type.");
            return;
        }

        try {
            await msg.channel.send({
                content,
                files: files.length > 0 ? files : undefined,
            });
            await msg.delete();
        } catch (err) {
            console.error("Forward command error:", err);
            await msg.reply("⚠️ Could not forward the message.");
        }
    },
});
