import { defineCommand } from "..";
import { Message, TextChannel } from "discord.js";
import {
    SUBCOMMANDS_LIST,
    resolveSubcommand,
    type SubCommand,
} from "../../utils/bf6commands/constants";
import {
    leaderboardHandler,
    playStyleHandler,
    itemsHandler,
    classesHandler,
    historyHandler,
    refreshHandler,
} from "../../utils/bf6commands";

async function safeReply(msg: Message, content: string): Promise<Message | void> {
    try {
        return await msg.reply(content);
    } catch (err) {
        const isUnknownReference =
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as any).code === 50035 &&
            typeof (err as any).message === "string" &&
            (err as any).message.includes("MESSAGE_REFERENCE_UNKNOWN_MESSAGE");

        if (isUnknownReference && "send" in msg.channel && typeof msg.channel.send === "function") {
            return await msg.channel.send(content);
        }

        throw err;
    }
}

const HANDLERS: Record<SubCommand, (msg: Message, args: string[], reply: (content: string) => Promise<Message | void>) => Promise<void>> = {
    kills: (m, a, r) => leaderboardHandler("kills", m, a, r),
    deaths: (m, a, r) => leaderboardHandler("deaths", m, a, r),
    revives: (m, a, r) => leaderboardHandler("revives", m, a, r),
    score: (m, a, r) => leaderboardHandler("score", m, a, r),
    rank: (m, a, r) => leaderboardHandler("rank", m, a, r),
    timePlayed: (m, a, r) => leaderboardHandler("timePlayed", m, a, r),
    trackergg: (m, a, r) => leaderboardHandler("trackergg", m, a, r),
    playStyle: (m, a, r) => playStyleHandler("playStyle", m, a, r),
    rpg: (m, a, r) => itemsHandler("rpg", m, a, r),
    c4: (m, a, r) => itemsHandler("c4", m, a, r),
    mine: (m, a, r) => itemsHandler("mine", m, a, r),
    claymore: (m, a, r) => itemsHandler("claymore", m, a, r),
    knife: (m, a, r) => itemsHandler("knife", m, a, r),
    frag: (m, a, r) => itemsHandler("frag", m, a, r),
    sledgehammer: (m, a, r) => itemsHandler("sledgehammer", m, a, r),
    mbt: (m, a, r) => itemsHandler("mbt", m, a, r),
    ifv: (m, a, r) => itemsHandler("ifv", m, a, r),
    vehicles: (m, a, r) => itemsHandler("vehicles", m, a, r),
    helicopter: (m, a, r) => itemsHandler("helicopter", m, a, r),
    planes: (m, a, r) => itemsHandler("planes", m, a, r),
    class: (m, a, r) => classesHandler("class", m, a, r),
    assault: (m, a, r) => classesHandler("assault", m, a, r),
    engineer: (m, a, r) => classesHandler("engineer", m, a, r),
    support: (m, a, r) => classesHandler("support", m, a, r),
    recon: (m, a, r) => classesHandler("recon", m, a, r),
    history: (m, a, r) => historyHandler("history", m, a, r),
    refresh: (m, a, r) => refreshHandler("refresh", m, a, r),
    bans: async (_msg, _args, reply) => {
        await reply("pablocc74 - 2 bans");
    },
};

export default defineCommand({
    name: "bf6",
    description: "BF6 stats",
    type: "TEXT",
    async execute(msg: Message, args: string[]) {
        if (!(msg.channel instanceof TextChannel)) {
            await safeReply(msg, "This command can only be used in a text channel.");
            return;
        }

        const rawSub = args[0];
        const sub = resolveSubcommand(rawSub);

        if (!sub) {
            const hasInput = Boolean(rawSub?.trim());
            const msgText = hasInput
                ? `Unknown subcommand. Available: ${SUBCOMMANDS_LIST}`
                : "Te falta el subcommand máquina:\n" + SUBCOMMANDS_LIST;
            await safeReply(msg, msgText);
            return;
        }

        try {
            const handler = HANDLERS[sub];
            if (!handler) {
                await safeReply(msg, `Unknown subcommand. Available: ${SUBCOMMANDS_LIST}`);
                return;
            }
            await handler(msg, args, (content) => safeReply(msg, content));
        } catch (err) {
            console.error(err);
            await safeReply(msg, "⚠️ Could not load BF6 rank data.");
        }
    }
});
