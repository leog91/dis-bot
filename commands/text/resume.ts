import { defineCommand } from "..";
import { useVoice } from "../../voice";
import { Message } from "discord.js";

export default defineCommand({
    name: "resume",
    type: "TEXT",
    description: "Resumes paused audio",

    async execute(msg: Message) {
        if (!msg.guild) return;

        const voice = useVoice(msg.guild.id);
        voice.resume(msg);
    }
});