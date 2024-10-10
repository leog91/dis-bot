import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    generateDependencyReport,
    entersState,
    StreamType,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    VoiceConnection,
} from "@discordjs/voice";

import { randomAsset } from "./utils.js";
import { Message } from "discord.js"; // Ensure you have the correct Discord.js import

console.log("++++++++++", generateDependencyReport());

const player = createAudioPlayer();

export function playSong(): Promise<void> {
    const resource = createAudioResource(
        "./assets/audio/giraldo+de+ayer-001.mp3"
    );

    player.play(resource);
    console.log("player . play ---");

    return entersState(player, AudioPlayerStatus.Playing, 5e3).then(() => {
        // Do nothing on resolve; just ensure it completes
    });
}

export function playSongBis(audio: string): Promise<void> {
    const resource = createAudioResource(`./assets/audio/${audio}.mp3`);
    player.play(resource);

    return entersState(player, AudioPlayerStatus.Playing, 5e3).then(() => {
        // Do nothing on resolve; just ensure it completes
    });
}

export const playRandom = (command: string): Promise<void> => {
    const resource = createAudioResource(randomAsset(command));
    player.play(resource);

    return entersState(player, AudioPlayerStatus.Playing, 5e3).then(() => {
        // Do nothing on resolve; just ensure it completes
    });
};

// Functions to control the audio player
export const stop = (): boolean => {
    return player.stop(); // This will now return the boolean value
};

export const pause = (): boolean => {
    return player.pause(); // This will now return the boolean value
};

export const resume = (): boolean => {
    return player.unpause(); // This will now return the boolean value
};

async function connectToChannel(channel: { id: string; guild: { id: string; }; }, adapter: any): Promise<VoiceConnection> {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: adapter,
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
        return connection;
    } catch (error) {
        connection.destroy();
        throw error;
    }
}

export const voiceFun = async (message: Message): Promise<void> => {
    const channel = message.member?.voice.channel;

    // Check if guild exists
    if (!message.guild) {
        message.reply("This command can only be used in a server.");
        return;
    }

    if (channel) {
        try {
            const connection = await connectToChannel(
                channel,
                message.guild.voiceAdapterCreator
            );

            connection.subscribe(player);
            console.log("PLAYING NOW");
        } catch (error) {
            console.error(error);
        }
    } else {
        message.reply("Join a voice channel then try again!");
    }
};