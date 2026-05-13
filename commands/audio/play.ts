import { defineCommand } from "..";
import { useVoice } from "../../voice";
import { Message } from "discord.js";

export default defineCommand({
    name: "play",
    type: "AUDIO",
    description: "Play a specific audio file from a folder. Usage: play <folder> <name>",

    async execute(msg: Message, args: string[]): Promise<void> {
        if (!msg.guild) return;

        if (args.length < 2) {
            await msg.reply("Usage: `play <folder> <name>`");
            return;
        }

        const folder = args[0];
        const search = args.slice(1).join(" ");

        const voice = useVoice(msg.guild.id);
        await voice.playFromFolder(msg, folder, search);
    }
});
