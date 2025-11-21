import { VoiceState } from "discord.js";
import { logger } from "../utils/logger";

export default function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const guild = newState.guild;
    const server = guild.name;
    const memberName = newState.member?.user.tag || "Unknown User";

    // Joined or left voice channel
    if (!oldState.channel && newState.channel) {
        logger(server, `${memberName} joined voice channel ${newState.channel.name}`, "VOICE");
    } else if (oldState.channel && !newState.channel) {
        logger(server, `${memberName} left voice channel ${oldState.channel.name}`, "VOICE");
    } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        logger(server, `${memberName} switched from ${oldState.channel.name} to ${newState.channel.name}`, "VOICE");
    }

    // Mute/Unmute
    if (oldState.selfMute !== newState.selfMute) {
        logger(server, `${memberName} ${newState.selfMute ? "muted" : "unmuted"} themselves`, "VOICE");
    }
    if (oldState.serverMute !== newState.serverMute) {
        logger(server, `${memberName} was ${newState.serverMute ? "server muted" : "server unmuted"}`, "VOICE");
    }

    // Deaf/Undeaf
    if (oldState.selfDeaf !== newState.selfDeaf) {
        logger(server, `${memberName} ${newState.selfDeaf ? "deafened" : "undeafened"} themselves`, "VOICE");
    }
    if (oldState.serverDeaf !== newState.serverDeaf) {
        logger(server, `${memberName} was ${newState.serverDeaf ? "server deafened" : "server undeafened"}`, "VOICE");
    }
}

