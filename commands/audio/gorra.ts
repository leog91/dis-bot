import { defineCommand } from "..";

import { useVoice } from "../../voice";

export default defineCommand({
    name: "gorra",
    type: "AUDIO",
    description: "",

    async execute(msg) {
        const voice = useVoice(msg.guild!.id);
        await voice.play(msg, "gorra");
    }
});