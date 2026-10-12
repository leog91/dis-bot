import { Interaction, ComponentType } from "discord.js";
import { logger } from "../utils/logger";
import { crashCounterStore, type GuildCrashData } from "../services/crashCounter.service";

const selectedUser = new Map<string, string>();
const CRASH_USER_SELECT_ID = "crash_user_select";
const CRASH_BUTTON_IDS = new Set(["crash_add", "crash_remove"]);

function renderTable(guildData: GuildCrashData): string {
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

    const isCrashUserSelect = interaction.componentType === ComponentType.UserSelect
        && interaction.customId === CRASH_USER_SELECT_ID;
    const isCrashButton = interaction.isButton()
        && CRASH_BUTTON_IDS.has(interaction.customId);
    if (!isCrashUserSelect && !isCrashButton) return;

    const server = interaction.guild.name;
    try {
        if (isCrashUserSelect) {
            await interaction.deferUpdate();
            const userId = interaction.values[0];
            selectedUser.set(interaction.message.id, userId);
            const user = await interaction.client.users.fetch(userId);
            logger(server, `${interaction.user.tag} selected user: ${user.username} (${userId})`, "SELECT");
            return;
        }

        if (!interaction.isButton()) return;
        const userId = selectedUser.get(interaction.message.id);
        if (!userId) {
            await interaction.reply({ content: "Select a user first." });
            return;
        }

        await interaction.deferUpdate();
        const user = await interaction.client.users.fetch(userId);
        const action = interaction.customId === "crash_add" ? "add" : "remove";
        const guildData = crashCounterStore.update(
            interaction.guild.id, userId, user.username, action === "add" ? 1 : -1,
        );
        logger(server, `${interaction.user.tag} pressed button: ${action}`, "BUTTON");
        await interaction.editReply({
            content: `💥 **Crash Tracker**\n\n${renderTable(guildData)}`,
            components: interaction.message.components,
        });
    } catch (err) {
        logger(server, `Failed to handle crash interaction: ${err}`, "ERROR");
    }
}
