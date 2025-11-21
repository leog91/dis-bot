


import { defineCommand } from "..";
import { guilds } from "../../utils/constants";
import { useVoice } from "../../voice";

export default defineCommand({
    name: "petifica3",
    type: "AUDIO",
    description: "petifica3",
    permissions: [
        { type: "GUILD", ids: [guilds.wanna, guilds.plll] }
    ],


    async execute(msg) {
        const voice = useVoice(msg.guild!.id);
        await voice.play(msg, "petifica3");
    }
});