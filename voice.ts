
import googleTTS from "google-tts-api";
import { randomUUID } from "crypto";
import fs from "fs";


import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayer,
    AudioResource,
    AudioPlayerStatus,
    VoiceConnection,
    StreamType,
} from "@discordjs/voice";
import fetch from "node-fetch";
import { Message, Guild } from "discord.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



export class GuildVoiceManager {
    guildId: string;
    connection: VoiceConnection | null = null;
    player: AudioPlayer | null = null;

    constructor(guildId: string) {
        this.guildId = guildId;
    }


    // Ensure connection + player exist
    async ensureReady(msg: Message): Promise<AudioPlayer> {
        const channel = msg.member?.voice.channel;
        if (!channel) {
            throw new Error("User is not in a voice channel.");
        }

        if (!this.connection) {
            this.connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: this.guildId,
                adapterCreator: msg.guild!.voiceAdapterCreator as any,
            });
        }

        if (!this.player) {
            this.player = createAudioPlayer();
            this.connection.subscribe(this.player);
        }

        return this.player;
    }


    async playTTS(msg: Message, text: string, lang = "en") {
        let player;

        try {
            player = await this.ensureReady(msg);
        } catch (err: any) {
            await msg.reply("⚠️ " + err.message);
            return;
        }

        const url = googleTTS.getAudioUrl(text, {
            lang,
            slow: false,
            host: "https://translate.google.com",
        });

        const tempFile = join(__dirname, `./tts-${randomUUID()}.mp3`);

        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(tempFile, buffer);

        const resource = createAudioResource(tempFile);

        player.removeAllListeners();
        player.play(resource);

        player.once(AudioPlayerStatus.Idle, () => {
            fs.unlink(tempFile, () => { });
        });

        player.on("error", (err) => {
            console.error("TTS error:", err);
            fs.unlink(tempFile, () => { });
            msg.reply(" TTS playback failed.");
        });
    }

    // Join explicitly
    async join(msg: Message) {
        const channel = msg.member?.voice.channel;
        if (!channel) return msg.reply("❌ You must be in a voice channel.");

        if (!this.connection) {
            this.connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: this.guildId,
                adapterCreator: msg.guild!.voiceAdapterCreator as any,
            });
        }

        if (!this.player) {
            this.player = createAudioPlayer();
            this.connection.subscribe(this.player);
        }

        msg.reply(`🔊 Joined **${channel.name}**.`);
    }

    // Leave & cleanup
    async leave(msg?: Message | Guild) {
        if (!this.connection) {
            if (msg instanceof Message) msg.reply("🚫 Not in a voice channel.");
            return;
        }

        this.connection.disconnect();
        this.connection = null;
        this.player = null;

        if (msg instanceof Message) msg.reply("👋 Disconnected from voice.");
    }


    // Play audio (mp3 / ogg supported)
    async play(msg: Message, filename: string, isRandom = false) {
        let player: AudioPlayer;

        try {
            player = await this.ensureReady(msg);
        } catch (err: any) {
            return msg.reply("⚠️ " + err.message);
        }

        const hasExtension = /\.[a-z0-9]+$/i.test(filename);

        const filePath = isRandom
            ? join(__dirname, `./assets/audio/age/${filename}`)
            : join(
                __dirname,
                `./assets/audio/${hasExtension ? filename : `${filename}.mp3`}`
            );

        const inputType = filePath.endsWith(".ogg")
            ? StreamType.OggOpus
            : undefined;

        const resource: AudioResource<any> = createAudioResource(filePath, {
            inputType,
        });

        player.removeAllListeners();
        player.play(resource);

        player.on(AudioPlayerStatus.Playing, () => {
            // console.log(`Now playing: ${filePath}`);
        });

        player.on("error", (err) => {
            console.error(err);
            msg.reply("⚠️ Audio playback error.");
        });
    }

    pause(msg: Message) {
        if (!this.player) return msg.reply("⏸️ Nothing is playing.");
        this.player.pause();
        msg.reply("⏸️ Paused.");
    }

    resume(msg: Message) {
        if (!this.player) return msg.reply("▶️ Nothing to resume.");
        this.player.unpause();
        msg.reply("▶️ Resumed.");
    }

    stop(msg: Message) {
        if (!this.player) return msg.reply("⛔ No audio to stop.");
        this.player.stop();
        msg.reply("🛑 Stopped.");
    }

    async followMe(msg: Message) {
        await this.leave();
        await this.join(msg);
    }
}




// Managers storage

const managers = new Map<string, GuildVoiceManager>();

export function useVoice(guildId: string): GuildVoiceManager {
    if (!managers.has(guildId)) {
        managers.set(guildId, new GuildVoiceManager(guildId));
    }
    return managers.get(guildId)!;
}
