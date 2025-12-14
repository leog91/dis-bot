import fs from "fs";
import { logger } from "../utils/logger";  // <-- add logger import
import { ButtonInteraction } from "discord.js";

const FILE = "./crashcounter.json";

// Load
let data = { counter: 0 };
if (fs.existsSync(FILE)) {
    data = JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function save() {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export default async function onInteraction(interaction: ButtonInteraction) {
    if (!interaction.isButton()) return;

    const server = interaction.guild?.name || "DM";
    const user = interaction.user;

    let action = "";

    switch (interaction.customId) {
        case "crash_add":
            data.counter++;
            action = "crash_add";
            break;

        case "crash_remove":
            data.counter--;
            action = "crash_remove";
            break;

        case "crash_reset":
            data.counter = 0;
            action = "crash_reset";
            break;

        default:
            return;
    }

    // Save change
    save();

    // Log who pressed the button
    logger(server, `${user.tag} pressed button: ${action}`, "BUTTON");

    return interaction.update({
        content: `💥 Crash Counter: **${data.counter}**`,
    });
}

