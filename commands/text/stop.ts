import { useVoice } from "../../voice";
import { Message } from "discord.js";

export default {
    name: "stop",
    description: "Stops the current audio",
    type: "TEXT",
    async execute(msg: Message) {
        if (!msg.guild) return;

        const voice = useVoice(msg.guild.id);
        await voice.stop(msg); // stops the audio in that guild
    }
}