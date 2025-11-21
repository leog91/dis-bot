


import { defineCommand } from "..";

import { useVoice } from "../../voice";

export default defineCommand({
    name: "see-you-later",
    type: "AUDIO",
    description: "see-you-later",
    hidden: true,



    async execute(msg) {
        const voice = useVoice(msg.guild!.id);
        await voice.play(msg, "see-you-later");
    }
});