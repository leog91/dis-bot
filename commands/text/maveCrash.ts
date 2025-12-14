import { defineCommand } from "..";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Message,
} from "discord.js";
import fs from "fs";
import { guilds } from "../../utils/constants";

const FILE = "./crashcounter.json";

// Load file or create one
let data = { counter: 0 };
if (fs.existsSync(FILE)) {
    data = JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function save() {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export default defineCommand({
    name: "maveCrash",
    description: "Mave stability",
    type: "TEXT",
    permissions: [
        { type: "GUILD", ids: [guilds.Bytes, guilds.plll] }
    ],

    async execute(msg: Message) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("crash_add")
                .setLabel("➕")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("crash_remove")
                .setLabel("➖")
                .setStyle(ButtonStyle.Danger),


            // new ButtonBuilder()
            //     .setCustomId("crash_reset")
            //     .setLabel("🔁 Reset")
            //     .setStyle(ButtonStyle.Secondary)
        );

        await msg.reply({
            content: `💥 Crash Counter: **${data.counter}**`,
            components: [row],
        });
    },
});