import { defineCommand } from "..";
import { logger } from "../../utils/logger";
import { useVoice } from "../../voice";

export default defineCommand({
    name: "pain",
    type: "AUDIO",
    description: "random",

    async execute(msg, _args) {
        if (!msg.guild) return;

        const voice = useVoice(msg.guild.id);

        const played = await voice.playRandomNoRepeat(msg, "age");
        if (played) {
            const server = msg.guild?.name || "DM";
            logger(server, `Pain played: ${played} by ${msg.author.tag}`, "VOICE");
        }

        await msg.react("🫦");

        return; // Ensures Promise<void>
    }
});
