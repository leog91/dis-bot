import { defineCommand } from "..";
import { useVoice } from "../../voice";

export default defineCommand({
    name: "puerta",
    type: "AUDIO",
    description: "Knocks on the door",

    async execute(msg) {
        const voice = useVoice(msg.guild!.id);
        await voice.play(msg, "knock2");
    }
});