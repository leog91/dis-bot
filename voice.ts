

// voice.ts
import { join } from "path";
import { createAudioPlayer, joinVoiceChannel, createAudioResource, AudioPlayerStatus, VoiceConnection, AudioPlayer, AudioResource } from "@discordjs/voice";

import { dirname } from "path";
import { fileURLToPath } from "url";

import { Message } from "discord.js";
import { randomAsset } from "./utils.ts";
const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);



// Maps to store audio players and connections per guild (server)
const audioPlayers = new Map<string, AudioPlayer>();
const connections = new Map<string, VoiceConnection>();

// Function to join a voice channel
export const joinVoiceC = async (message: Message) => {
    const channel = message.member?.voice.channel;

    // Check if the guild and channel are not null
    if (message.guild && channel) {
        // Join the voice channel using joinVoiceChannel from @discordjs/voice
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator as any, // Use 'as any' if necessary
        });

        // Store the connection in the Map
        connections.set(message.guild.id, connection);

        // Create and store a new audio player for this guild if it doesn’t exist
        if (!audioPlayers.has(message.guild.id)) {
            const player = createAudioPlayer();
            audioPlayers.set(message.guild.id, player);
            connection.subscribe(player);
        }

        console.log(`Joined voice channel: ${channel.name} in guild: ${message.guild.name}`);
    } else {
        message.reply("You need to be in a voice channel to use this command!");
    }
};



//Function to leave the voice channel
export const leaveVoiceChannel = (message: Message) => {
    const guildId = message.guild?.id;
    if (guildId && connections.has(guildId)) {
        const connection = connections.get(guildId);
        if (connection) {
            connection.disconnect();
            connections.delete(guildId);
            audioPlayers.delete(guildId);
            console.log(`Left voice channel in guild: ${message.guild?.name}`);
        }
    } else {
        message.reply("The bot is not connected to a voice channel in this server.");
    }
};


// Function to change to a new voice channel
export const changeVoiceChannel = async (message: Message) => {
    const currentGuildId = message.guild?.id;
    const channel = message.member?.voice.channel;

    // Check if the user is in a voice channel
    if (!channel) {
        message.reply("You need to be in a voice channel to change channels!");
        return;
    }

    // Check if the bot is already connected to a voice channel
    if (connections.has(currentGuildId || "")) {
        leaveVoiceChannel(message); // Leave the current channel
    }

    // Join the new voice channel
    await joinVoiceC(message);
};



// Function to play a specific song
export const playSong = async (songName: string, message: Message, isRandom: boolean = false) => {

    const guildId = message.guild?.id;
    const player = audioPlayers.get(guildId || "");
    let resource: AudioResource<null>

    if (isRandom) {
        resource = createAudioResource(join(__dirname, `./assets/audio/age/${songName}`));
    } else {
        resource = createAudioResource(join(__dirname, `./assets/audio/${songName}.mp3`));
    }

    if (player) {


        // cleaning player
        player.removeAllListeners()


        player.play(resource);

        player.on(AudioPlayerStatus.Playing, () => {
            console.log(`Now playing: ${songName}`);
        });



        // audioPlayer.on(AudioPlayerStatus.Idle, () => {
        //     leaveVoiceChannel();
        // });

        player.on('error', error => {
            console.error(`Error: ${error.message}`);
            message.reply("There was an error playing the audio.");
        });
    }
    if (!player) {
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
    const guildId = message.guild?.id;
    const player = audioPlayers.get(guildId || "");
    if (player) {
        player.stop();
        message.reply("Playback stopped.");
    } else {
        message.reply("No audio is playing in this server.");
    }
};

// Function to pause playback
export const pause = (message: Message) => {
    const guildId = message.guild?.id;
    const player = audioPlayers.get(guildId || "");
    if (player) {
        player.pause();
        message.reply("Playback paused.");
    } else {
        message.reply("No audio is playing in this server.");
    }
};

// Function to resume playback
export const resume = (message: Message) => {
    const guildId = message.guild?.id;
    const player = audioPlayers.get(guildId || "");
    if (player) {
        player.unpause();
        message.reply("Playback resumed.");
    } else {
        message.reply("No audio is paused in this server.");
    }
};
// Function to play a random song
export const playRandom = async (category: string, message: Message) => {

    const random = randomAsset("age")
    //    await playSong(randomSong, message);
    await playSong(random, message, true);
};


// Function to perform voice-related actions (join voice channel if not already connected)
export const voiceFun = async (message: Message) => {
    const guildId = message.guild?.id;
    if (guildId && !connections.has(guildId)) {
        await joinVoiceC(message);
    }
    // Additional voice-related actions can be added here
};


export const followMe = async (message: Message) => {
    // const guildId = message.guild?.id;

    leaveVoiceChannel(message)
    await joinVoiceC(message);

    // Additional voice-related actions can be added here
};




// Exporting the maps for potential usage in other modules (if needed)
export { audioPlayers, connections };

