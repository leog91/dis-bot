import { defineCommand } from "..";
import { useVoice } from "../../voice";
import { randomAsset } from "../../utils";

export default defineCommand({
    name: "pain",
    type: "AUDIO",
    description: "random",

    async execute(msg, _args) {
        if (!msg.guild) return;

        const voice = useVoice(msg.guild.id);

        const file = randomAsset("age");
        if (!file) {
            await msg.reply("⚠️ No audio files found in this category.");
            return;
        }

        await voice.play(msg, file, true);

        await msg.react("🫦");

        return; // Ensures Promise<void>
    }
});