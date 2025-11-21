import { TextChannel, ThreadChannel, NewsChannel } from "discord.js";
import { defineCommand } from "..";
import { sendRandomImg } from "../../utils";

export default defineCommand({
    name: "cat",
    type: "TEXT",
    description: "Sends a random cat image",
    async execute(msg) {

        const channel = msg.channel;

        if (
            channel instanceof TextChannel ||
            channel instanceof ThreadChannel ||
            channel instanceof NewsChannel
        ) {

            await sendRandomImg("cat", channel as TextChannel);
        } else {
            await msg.reply("Cannot send images in this channel type.");
        }
    }
});