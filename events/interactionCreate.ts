// interactionCreate.ts
import { Interaction, ComponentType } from "discord.js";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger"; // adjust path

const FILE = path.resolve("./crashcounter.json");

type GuildData = {
    users: Record<string, { name: string; crashes: number }>;
};

type CrashData = Record<string, GuildData>;

const selectedUser = new Map<string, string>();

function loadData(): CrashData {
    if (!fs.existsSync(FILE)) {
        fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
        return {};
    }
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveData(data: CrashData) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function renderTable(guildData: GuildData): string {
    const users = Object.values(guildData.users ?? {});
    if (!users.length) return "No crashes recorded yet.";
    return users
        .sort((a, b) => b.crashes - a.crashes)
        .map(u => `${u.name} — **${u.crashes}**`)
        .join("\n");
}

export default async function interactionCreate(interaction: Interaction) {
    if (!interaction.isMessageComponent()) return;
    if (!interaction.guild) return;

    const data = loadData();
    if (!data[interaction.guild.id]) data[interaction.guild.id] = { users: {} };
    const guildData = data[interaction.guild.id];

    const server = interaction.guild?.name || "DM";

    // ------------------ USER SELECT ------------------
    if (interaction.componentType === ComponentType.UserSelect) {
        const userId = interaction.values[0];
        selectedUser.set(interaction.message.id, userId);

        // Fetch the selected user's info
        const selectedUserObj = await interaction.client.users.fetch(userId);

        // Log the selection
        const user = interaction.user;
        logger(
            server,
            `${user.tag} selected user: ${selectedUserObj.username} (${userId})`,
            "SELECT"
        );

        try {
            await interaction.deferUpdate();
        } catch {
            // ignore
        }
        return;
    }

    // ------------------ BUTTONS ------------------
    if (!interaction.isButton()) return;

    const userId = selectedUser.get(interaction.message.id);
    if (!userId) {
        try {
            await interaction.reply({ content: "Select a user first." });
        } catch { }
        return;
    }

    const user = await interaction.client.users.fetch(userId);
    if (!guildData.users[userId]) {
        guildData.users[userId] = { name: user.username, crashes: 0 };
    }

    let action = "";
    if (interaction.customId === "crash_add") {
        guildData.users[userId].crashes++;
        action = "add";
    } else if (interaction.customId === "crash_remove") {
        guildData.users[userId].crashes =
            Math.max(0, guildData.users[userId].crashes - 1);
        action = "remove";
    }

    // Log the button press
    logger(server, `${interaction.user.tag} pressed button: ${action}`, "BUTTON");

    saveData(data);

    try {
        await interaction.deferUpdate();
    } catch { }

    try {
        await interaction.editReply({
            content: `💥 **Crash Tracker**\n\n${renderTable(guildData)}`,
            components: interaction.message.components,
        });
    } catch { }
}
