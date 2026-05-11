import { Message, TextChannel } from "discord.js";
import { defineCommand } from "..";
import {
    createVidProgressMessage,
    getVidSourceInfo,
    resolveVidOutputUrl,
    sendVidResponse,
    trySendRedditVideo,
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

        let progress: VidProgressMessage | undefined;

        try {
            const sourceInfo = getVidSourceInfo(url);

            if (sourceInfo.isRedditLike) {
                progress = await createVidProgressMessage(msg, "Preparing Reddit video...");
                const redditResult = await trySendRedditVideo(msg, url, progress);
                if (redditResult.sent) {
                    return;
                }

                const notice = "notice" in redditResult ? redditResult.notice : undefined;
                const outputUrl = await resolveVidOutputUrl(url, sourceInfo);
                await progress.update("Couldn't upload the video, sending the link instead...");
                await sendVidResponse(msg, outputUrl, notice, progress);
                return;
            }

            const outputUrl = await resolveVidOutputUrl(url, sourceInfo);
            await sendVidResponse(msg, outputUrl);
        } catch (err) {
            console.error(err);
            await progress?.remove();
            await msg.channel.send("An error occurred while processing the video.");
        }
    }
});
