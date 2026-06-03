import { VoiceState } from "discord.js";
import { logger } from "../utils/logger";
import { useVoice } from "../voice";
import { getUserProfileByDiscordId, getRandomNickname } from "../../dis-bot-assets-private/config/users";
import { isGreetingEnabled, addUnknownUser, setServerName } from "../services/greeting.service";

function trackUnknownUser(state: VoiceState) {
    if (state.member?.user.bot) return;
    const userProfile = getUserProfileByDiscordId(state.id);
    if (!userProfile) {
        const displayName = state.member?.displayName || state.member?.user.username || "Unknown";
        addUnknownUser(state.id, displayName, state.guild.name);
    }
}

async function maybeGreet(state: VoiceState) {
    const guild = state.guild;
    if (state.member?.user.bot) return;

    const botVoiceChannel = guild.members.me?.voice.channel;
    if (!botVoiceChannel || botVoiceChannel.id !== state.channelId) return;
    if (!isGreetingEnabled(guild.id)) return;
    setServerName(guild.id, guild.name);

    const userProfile = getUserProfileByDiscordId(state.id);
    if (userProfile && userProfile.ttsGreetingEnabled === true) {
        const nickname = getRandomNickname(userProfile);
        // Build greeting: use custom template if it's a non-empty string, otherwise fall back
        let greetingText: string;
        if (userProfile.greetingText && userProfile.greetingText.trim().length > 0) {
            if (userProfile.greetingText.includes("{nickname}")) {
                greetingText = userProfile.greetingText.replaceAll("{nickname}", nickname);
            } else {
                greetingText = `${userProfile.greetingText} ${nickname}`;
            }
        } else {
            greetingText = `Hola ${nickname}`;
        }
        console.log(`[greeting] ${state.member?.user.tag}: text="${greetingText}", nickname="${nickname}"`);
        const lang = userProfile.ttsLang ?? "es";
        const voice = useVoice(guild.id);
        await voice.playTTSInChannel(
            state.channel!.id,
            guild.voiceAdapterCreator,
            greetingText,
            lang,
        );
    }
}

export default async function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const guild = newState.guild;
    const server = guild.name;
    const memberName = newState.member?.user.tag || "Unknown User";

    // Joined or left voice channel
    if (!oldState.channel && newState.channel) {
        logger(server, `${memberName} joined voice channel ${newState.channel.name}`, "VOICE");
        trackUnknownUser(newState);
        await maybeGreet(newState);
    } else if (oldState.channel && !newState.channel) {
        logger(server, `${memberName} left voice channel ${oldState.channel.name}`, "VOICE");
    } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        logger(server, `${memberName} switched from ${oldState.channel.name} to ${newState.channel.name}`, "VOICE");
        trackUnknownUser(newState);
        await maybeGreet(newState);
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

