import { defineCommand } from "..";
import { useVoice } from "../../voice";
import { Message } from "discord.js";


const SUPPORTED_LANGS = new Set([
    "en", "es", "fr", "de", "it", "pt", "ru",
    "ja", "ko", "zh-cn", "zh-tw",
    "ar", "hi", "tr", "pl", "nl"
]);
export default defineCommand({
    name: "say",
    type: "AUDIO",
    description: "tts",

    async execute(msg: Message, args: string[]): Promise<void> {
        if (!msg.guild) return;

        if (!args.length) {
            await msg.reply("decime algo.");
            return;
        }

        let lang = "en";
        let textArgs = args;

        // Detect language code
        if (SUPPORTED_LANGS.has(args[0].toLowerCase())) {
            lang = args[0].toLowerCase();
            textArgs = args.slice(1);
        }

        const text = textArgs.join(" ");
        if (!text) {
            await msg.reply("🗣️ falta texto.");
            return;
        }

        const voice = useVoice(msg.guild.id);
        await voice.playTTS(msg, text, lang);
    }
});