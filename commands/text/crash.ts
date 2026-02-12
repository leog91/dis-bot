// crash.ts
import { defineCommand } from "..";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    UserSelectMenuBuilder,
    Message,
} from "discord.js";
import fs from "fs";
import path from "path";

const crashCounterPathFromEnv = process.env.CRASH_COUNTER_FILE_PATH
    ?? (process.env.ASSETS_PRIVATE_DIR
        ? path.join(process.env.ASSETS_PRIVATE_DIR, "crashcounter.json")
        : "./crashcounter.json");
const FILE = path.isAbsolute(crashCounterPathFromEnv)
    ? crashCounterPathFromEnv
    : path.resolve(crashCounterPathFromEnv);

type GuildData = {
    users: Record<string, { name: string; crashes: number }>;
};

type CrashData = Record<string, GuildData>; // key = guildId

// Ensure JSON exists
fs.mkdirSync(path.dirname(FILE), { recursive: true });
if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
}

function loadData(): CrashData {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return raw;
}

function saveData(data: CrashData) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function renderTable(data: GuildData): string {
    const users = Object.values(data.users ?? {});
    if (!users.length) return "naranja";
    return users
        .sort((a, b) => b.crashes - a.crashes)
        .map(u => `${u.name} — **${u.crashes}**`)
        .join("\n");
}

export default defineCommand({
    name: "crash",
    description: "Crash tracker",
    type: "TEXT",

    async execute(msg: Message) {
        if (!msg.guild) return;

        const data = loadData();
        if (!data[msg.guild.id]) data[msg.guild.id] = { users: {} };
        const guildData = data[msg.guild.id];

        const userSelect = new UserSelectMenuBuilder()
            .setCustomId("crash_user_select")
            .setPlaceholder("Select a user")
            .setMinValues(1)
            .setMaxValues(1);

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("crash_add")
                .setLabel("➕")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("crash_remove")
                .setLabel("➖")
                .setStyle(ButtonStyle.Danger)
        );

        const selectRow =
            new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);

        await msg.reply({
            content: `💥 **Crash Tracker**\n\n${renderTable(guildData)}`,
            components: [selectRow, buttons],
        });

        saveData(data);
    },
});
