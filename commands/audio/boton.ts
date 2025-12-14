import { defineCommand } from "..";
import { useVoice } from "../../voice";

export default defineCommand({
    name: "boton",
    type: "AUDIO",
    description: "",
    hidden: true,

    async execute(msg) {
        const voice = useVoice(msg.guild!.id);
        await voice.play(msg, "boton");
    }
});