import type { Message, PartialMessage } from "discord.js";
import { logger } from "../utils/logger";

const toOneLine = (value: string) => value.replace(/\r?\n/g, "\\n");

const getChannelLabel = (msg: Message | PartialMessage) => {
    const channel = msg.channel;

    if (channel && "name" in channel && channel.name) {
        return `#${channel.name}`;
    }

    return msg.channelId || "unknown";
};

export default async function onMessageDelete(msg: Message | PartialMessage) {
    if (msg.author?.bot) return;

    if (msg.content?.trim().toLowerCase().startsWith("vid ")) return;

    const server = msg.guild?.name || "DM";
    const channel = getChannelLabel(msg);
    const author = msg.author?.tag || msg.author?.id || "unknown";
    const sent = msg.createdAt?.toISOString() || "unknown";
    const deleted = new Date().toISOString();
    const content = msg.content ? toOneLine(msg.content) : "[content unavailable]";
    const attachments = msg.attachments?.size
        ? ` | attachments=${msg.attachments.map((attachment) => attachment.url).join(",")}`
        : "";

    logger(
        server,
        `Deleted message | channel=${channel} | author=${author} | sent=${sent} | deleted=${deleted} | content="${content}"${attachments}`,
        "MESSAGE"
    );
}
