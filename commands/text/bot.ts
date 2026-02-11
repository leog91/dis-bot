import { Message } from "discord.js";
import { defineCommand } from "..";
export default defineCommand({
    name: "bot",
    description: "Greeting",
    type: "TEXT",
    permissions: [],
    hidden: true,

    execute: async (msg: Message) => {
        msg.reply("BUEN DIA GRUPO");
    }

});

