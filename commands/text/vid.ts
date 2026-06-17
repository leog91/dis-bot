import { Embed, Message, TextChannel } from "discord.js";
import { defineCommand } from "..";
import {
    createVidProgressMessage,
    deleteOriginalMessage,
    getVidSourceInfo,
    resolveVidOutputUrl,
    trySendRedditVideo,
    trySendTwitterVideo,
    type VidProgressMessage,
} from "../../services/vid.service";
import { useVoice } from "../../voice";

const playAcknowledgementIfNeeded = async (msg: Message) => {
    if (!msg.guild || !msg.member?.voice.channelId) {
        return;
    }

    const voice = useVoice(msg.guild.id);
    const userChannelId = msg.member.voice.channelId;
    const botChannelId = voice.connection?.joinConfig.channelId;

    if (botChannelId && botChannelId === userChannelId) {
        try {
            await voice.playRandomNoRepeat(msg, "bot/task-acknowledged");
        } catch (err) {
            console.error("Failed to play task acknowledgment audio:", err);
        }
    }
};

const getUrlArg = (msg: Message) => msg.content.split(" ").slice(1)[0];

const waitForEmbed = async (
    message: Message,
    predicate: (embed: Embed) => boolean,
    timeoutMs = 5000
) => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        if (message.embeds.some(predicate)) {
            return true;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
            message = await message.fetch();
        } catch {
            return false;
        }
    }

    return message.embeds.some(predicate);
};

const isVideoEmbed = (embed: Embed) => Boolean(embed.video?.url);

const isAnyEmbed = () => true;

export default defineCommand({
    name: "vid",
    description: "ig/tw",
    type: "TEXT",
    hidden: false,
    permissions: [],
    execute: async (msg: Message) => {
        if (!(msg.channel instanceof TextChannel)) {
            await msg.reply("This command can only be used in a text channel.");
            return;
        }

        await playAcknowledgementIfNeeded(msg);

        const url = getUrlArg(msg);

        if (!url) {
            await msg.reply("y la url?");
            return;
        }

        try {
            new URL(url);
        } catch {
            await msg.reply("no es válida master");
            return;
        }

        await deleteOriginalMessage(msg);

        let progress: VidProgressMessage | undefined;
        let linkMessage: Message | undefined;

        try {
            const sourceInfo = getVidSourceInfo(url);
            const outputUrl = await resolveVidOutputUrl(url, sourceInfo);

            const linkContent = sourceInfo.isTwitterLike
                ? `[Tweet](<${url}>)\n${outputUrl}`
                : outputUrl;

            linkMessage = await msg.channel.send(`by ${msg.author}:\n${linkContent}`);

            const hasPreview = sourceInfo.isTwitterLike
                ? await waitForEmbed(linkMessage, isAnyEmbed)
                : await waitForEmbed(linkMessage, isVideoEmbed);
            if (hasPreview) {
                return;
            }

            if (sourceInfo.isRedditLike) {
                progress = await createVidProgressMessage(msg, "Preparing Reddit video...");
                const redditResult = await trySendRedditVideo(msg, url, progress);
                if (redditResult.sent) {
                    await linkMessage.delete().catch(() => {});
                    return;
                }

                await progress?.remove();
                if ("notice" in redditResult && redditResult.notice) {
                    await msg.channel.send(redditResult.notice);
                }
                return;
            }

            if (sourceInfo.isTwitterLike) {
                progress = await createVidProgressMessage(msg, "Preparing Twitter video...");
                const twitterResult = await trySendTwitterVideo(msg, url, progress);
                if (twitterResult.sent) {
                    await linkMessage.delete().catch(() => {});
                    return;
                }

                await progress?.remove();
                return;
            }
        } catch (err) {
            console.error(err);
            await progress?.remove();
            await linkMessage?.delete().catch(() => {});
            await msg.channel.send(`by ${msg.author}:\n${url}`);
        }
    }
});
