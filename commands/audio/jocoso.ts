

import { defineCommand } from "..";
import { guilds } from "../../utils/constants";
import { useVoice } from "../../voice";

export default defineCommand({
    name: "jocoso",
    type: "AUDIO",
    description: "jocoso",
    hidden: true,
    permissions: [
        { type: "GUILD", ids: [guilds.Bytes, guilds.plll] }
    ],


    async execute(msg) {
        const voice = useVoice(msg.guild!.id);
        await voice.play(msg, "jocoso");
    }
});