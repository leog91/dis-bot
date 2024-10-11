// import {
//     joinVoiceChannel,
//     createAudioPlayer,
//     createAudioResource,
//     generateDependencyReport,
//     entersState,
//     StreamType,
//     AudioPlayerStatus,
//     VoiceConnectionStatus,
//     VoiceConnection,
// } from "@discordjs/voice";

// import { randomAsset } from "./utils.js";
// import { Message } from "discord.js"; // Ensure you have the correct Discord.js import

// console.log("++++++++++", generateDependencyReport());

// const player = createAudioPlayer();

// export function playSong(): Promise<void> {
//     const resource = createAudioResource(
//         "./assets/audio/giraldo+de+ayer-001.mp3"
//     );

//     player.play(resource);
//     console.log("player . play ---");

//     return entersState(player, AudioPlayerStatus.Playing, 5e3).then(() => {
//         // Do nothing on resolve; just ensure it completes
//     });
// }

// export function playSongBis(audio: string): Promise<void> {
//     const resource = createAudioResource(`./assets/audio/${audio}.mp3`);
//     player.play(resource);

//     return entersState(player, AudioPlayerStatus.Playing, 5e3).then(() => {
//         // Do nothing on resolve; just ensure it completes
//     });
// }

// export const playRandom = (command: string): Promise<void> => {
//     const resource = createAudioResource(randomAsset(command));
//     player.play(resource);

//     return entersState(player, AudioPlayerStatus.Playing, 5e3).then(() => {
//         // Do nothing on resolve; just ensure it completes
//     });
// };

// // Functions to control the audio player
// export const stop = (): boolean => {
//     return player.stop(); // This will now return the boolean value
// };

// export const pause = (): boolean => {
//     return player.pause(); // This will now return the boolean value
// };

// export const resume = (): boolean => {
//     return player.unpause(); // This will now return the boolean value
// };

// async function connectToChannel(channel: { id: string; guild: { id: string; }; }, adapter: any): Promise<VoiceConnection> {
//     const connection = joinVoiceChannel({
//         channelId: channel.id,
//         guildId: channel.guild.id,
//         adapterCreator: adapter,
//     });

//     try {
//         await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
//         return connection;
//     } catch (error) {
//         connection.destroy();
//         throw error;
//     }
// }

// export const voiceFun = async (message: Message): Promise<void> => {
//     const channel = message.member?.voice.channel;

//     // Check if guild exists
//     if (!message.guild) {
//         message.reply("This command can only be used in a server.");
//         return;
//     }

//     if (channel) {
//         try {
//             const connection = await connectToChannel(
//                 channel,
//                 message.guild.voiceAdapterCreator
//             );

//             connection.subscribe(player);
//             console.log("PLAYING NOW");
//         } catch (error) {
//             console.error(error);
//         }
//     } else {
//         message.reply("Join a voice channel then try again!");
//     }
// };


// voice.ts
import { join } from "path";
import { createAudioPlayer, joinVoiceChannel, createAudioResource, AudioPlayerStatus, VoiceConnection, AudioPlayer } from "@discordjs/voice";

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
export const playSong = async (songName: string, message: Message) => {


    const resource = createAudioResource(join(__dirname, `./assets/audio/${songName}.mp3`));

    // const resource = createAudioResource(join(__dirname, `./assets/audio/age/death.mp3`));

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
    await playSong(songName, message);
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
    const songList = ["song1", "song2", "song3"]; // Add your song logic here
    const random = randomAsset("age")
    console.log(random, ">>>>>")
    const randomSong = songList[Math.floor(Math.random() * songList.length)];
    //    await playSong(randomSong, message);
    await playSong(random, message);
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



