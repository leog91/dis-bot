import { defineCommand } from "..";
import { guilds } from "../../utils/constants";
import { useVoice } from "../../voice";

export default defineCommand({
    name: "mayday",
    type: "AUDIO",
    description: "",
    permissions: [
        { type: "GUILD", ids: [guilds.Bytes, guilds.plll] }
    ],
    hidden: true,

    async execute(msg) {
        const voice = useVoice(msg.guild!.id);
        await voice.play(msg, "mayday.ogg");
    }
});