import { defineCommand } from "..";
import { Message, TextChannel } from "discord.js";
import { users } from "../../utils/constants";

export default defineCommand({
    name: "dnscfg",
    description: "Sends DNS reset commands",
    type: "TEXT",
    hidden: true,
    permissions: [
        { type: "USER", ids: [users.leog] }
    ],

    async execute(msg: Message) {

        if (!(msg.channel instanceof TextChannel)) return;

        await msg.channel.send(
            "```\nipconfig /flushdns\nnetsh winsock reset\n```"
        );
    }
});