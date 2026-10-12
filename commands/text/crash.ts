// crash.ts
import { defineCommand } from "..";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    UserSelectMenuBuilder,
    Message,
} from "discord.js";
import { crashCounterStore, type GuildCrashData } from "../../services/crashCounter.service";

function renderTable(data: GuildCrashData): string {
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

        const guildData = crashCounterStore.getGuild(msg.guild.id);

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

    },
});
