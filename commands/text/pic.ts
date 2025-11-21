import { Message, TextChannel } from "discord.js";
import { defineCommand } from "..";


export default defineCommand({
    name: "pic",
    description: "selfie",
    type: "TEXT",
    hidden: true,
    permissions: [], // empty = everyone can use
    execute: async (msg: Message) => {
        if (msg.channel instanceof TextChannel) {
            await msg.channel.send({ files: ["./assets/images/garolfa-profile.jpg"] });
        } else {
            await msg.reply("This command can only be used in a text channel.");
        }
    }
});