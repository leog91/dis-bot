import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  generateDependencyReport,
  entersState,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} from "@discordjs/voice";

import { randomAsset } from "./utils.js";

console.log("++++++++++", generateDependencyReport());

export function playSong() {
  // const resource = createAudioResource(
  //   "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  //   // data,
  //   {
  //     inputType: StreamType.Arbitrary,

  //   }
  // );

  //   const resource = createAudioResource("./droplet.mp3");

  // const resource = createAudioResource("./assets/audio/knock2.mp3");

  const resource = createAudioResource(
    "./assets/audio/giraldo+de+ayer-001.mp3"
  );

  player.play(resource);

  console.log("player . play ---");

  return entersState(player, AudioPlayerStatus.Playing, 5e3);
}

export function playSongBis(audio) {
  const resource = createAudioResource(`./assets/audio/${audio}.mp3`);

  player.play(resource);

  return entersState(player, AudioPlayerStatus.Playing, 5e3);
}

export const playRandom = (command) => {
  const resource = createAudioResource(randomAsset(command));
  player.play(resource);

  return entersState(player, AudioPlayerStatus.Playing, 5e3);
};

const player = createAudioPlayer();

export const stop = () => player.stop();
export const pause = () => player.pause();
export const resume = () => player.unpause();

async function connectToChannel(channel, adapter) {
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

export const voiceFun = async (message) => {
  const channel = message.member?.voice.channel;
  // console.log("1111");
  if (channel) {
    try {
      const connection = await connectToChannel(
        channel,
        message.guild.voiceAdapterCreator
      );
      //
      // console.log("2222");
      //
      connection.subscribe(player);
      // todo
      // connection.destroy

      // console.log("CONNECTION ---", connection);

      // message.reply("Playing now!");
      console.log("PLAYING NOW");
    } catch (error) {
      console.error(error);
    }
  } else {
    message.reply("Join a voice channel then try again!");
  }
};
