import { defineCommand } from "..";
import { useVoice } from "../../voice";
import { Message } from "discord.js";

export default defineCommand({
    name: "pause",
    type: "TEXT",
    description: "Pauses the currently playing audio",

    async execute(msg: Message) {
        if (!msg.guild) return;

        const voice = useVoice(msg.guild.id);
        voice.pause(msg);
    }
});