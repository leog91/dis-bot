import { Message, TextChannel } from "discord.js";
import { defineCommand } from "..";
import { guilds } from "../../utils/constants";


export default defineCommand({
    name: "locate-pabloc",
    description: "",
    type: "TEXT",
    hidden: true,
    permissions: [
        { type: "GUILD", ids: [guilds.Bytes, guilds.plll] }
    ],
    execute: async (msg: Message) => {
        if (msg.channel instanceof TextChannel) {
            await msg.reply("This action is unauthorised and cannot be completed by you bigotón.");
        } else {
            await msg.reply("This command can only be used in a text channel.");
        }
    }
});