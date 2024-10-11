

// voice.ts
import { join } from "path";
import { createAudioPlayer, joinVoiceChannel, createAudioResource, AudioPlayerStatus, VoiceConnection, AudioPlayer, AudioResource } from "@discordjs/voice";

import { dirname } from "path";
import { fileURLToPath } from "url";

import { Message } from "discord.js";
import { randomAsset } from "./utils.ts";
const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

const audioPlayer: AudioPlayer = createAudioPlayer();
let connection: VoiceConnection | null = null;

// Function to join a voice channel
export const joinVoiceC = async (message: Message) => {
    const channel = message.member?.voice.channel;

    // Check if the guild and channel are not null
    if (message.guild && channel) {
        // Join the voice channel using joinVoiceChannel from @discordjs/voice
        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator as any, // Use 'as any' if necessary
        });

        // Subscribe the audio player to the connection
        connection.subscribe(audioPlayer);
        console.log("Joined voice channel:", channel.name);
    } else {
        message.reply("You need to be in a voice channel to use this command!");
    }
};
// Function to leave the voice channel
export const leaveVoiceChannel = () => {
    if (connection) {
        connection.disconnect();
        connection = null;
        console.log("Left voice channel");
    }
};

// Function to play a specific song
export const playSong = async (songName: string, message: Message, isRandom: boolean = false) => {


    let resource: AudioResource<null>

    if (isRandom) {
        resource = createAudioResource(join(__dirname, `./assets/audio/age/${songName}`));
    } else {
        resource = createAudioResource(join(__dirname, `./assets/audio/${songName}.mp3`));
    }

    audioPlayer.play(resource);

    audioPlayer.on(AudioPlayerStatus.Playing, () => {
        console.log(`Now playing: ${songName}`);
    });

    // audioPlayer.on(AudioPlayerStatus.Idle, () => {
    //     leaveVoiceChannel();
    // });

    audioPlayer.on('error', error => {
        console.error(`Error: ${error.message}`);
        message.reply("There was an error playing the audio.");
    });

    if (!audioPlayer) {
        message.reply("Audio player is not initialized.");
    }
};

// Function to play a specific song and then perform voice actions
export const playSongBis = async (songName: string, message: Message) => {
    // console.log("songname", songName)
    await playSong(songName, message, false);
    voiceFun(message);
};

// Function to stop playback
export const stop = (message: Message) => {
    audioPlayer.stop();
    message.reply("Playback stopped.");
};

// Function to pause playback
export const pause = (message: Message) => {
    audioPlayer.pause();
    message.reply("Playback paused.");
};

// Function to resume playback
export const resume = (message: Message) => {
    audioPlayer.unpause();
    message.reply("Playback resumed.");
};

// Function to play a random song
export const playRandom = async (category: string, message: Message) => {

    const random = randomAsset("age")
    //    await playSong(randomSong, message);
    await playSong(random, message, true);
};

// Function to perform voice-related actions
export const voiceFun = async (message: Message) => {
    if (!connection) {
        await joinVoiceC(message);
    }
    // Additional voice-related actions can be added here
};

// Additional utility functions can be added here as necessary

export { audioPlayer };



