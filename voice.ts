
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayer,
    AudioResource,
    AudioPlayerStatus,
    VoiceConnection,
} from "@discordjs/voice";

import { Message, Guild } from "discord.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// -------------------------------------------------------
// Core DATA
// -------------------------------------------------------

export class GuildVoiceManager {
    guildId: string;
    connection: VoiceConnection | null = null;
    player: AudioPlayer | null = null;

    constructor(guildId: string) {
        this.guildId = guildId;
    }

    // ---------------------------------------------------
    // Ensure connection + player exist
    // ---------------------------------------------------
    async ensureReady(msg: Message): Promise<AudioPlayer> {
        const channel = msg.member?.voice.channel;
        if (!channel) {
            throw new Error("User is not in a voice channel.");
        }

        // Create connection if missing
        if (!this.connection) {
            this.connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: this.guildId,
                adapterCreator: msg.guild!.voiceAdapterCreator as any,
            });
        }

        // Create player if missing
        if (!this.player) {
            this.player = createAudioPlayer();
            this.connection.subscribe(this.player);
        }

        return this.player;
    }

    // ---------------------------------------------------
    // Join explicitly
    // ---------------------------------------------------
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

    // ---------------------------------------------------
    // Leave & cleanup
    // ---------------------------------------------------
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

    // ---------------------------------------------------
    // Play audio
    // ---------------------------------------------------
    async play(msg: Message, filename: string, isRandom = false) {
        let player: AudioPlayer;

        try {
            player = await this.ensureReady(msg);
        } catch (err: any) {
            return msg.reply("⚠️ " + err.message);
        }

        const filePath = isRandom
            ? join(__dirname, `./assets/audio/age/${filename}`)
            : join(__dirname, `./assets/audio/${filename}.mp3`);

        const resource: AudioResource<any> = createAudioResource(filePath);

        player.removeAllListeners();
        player.play(resource);

        player.on(AudioPlayerStatus.Playing, () => {
            // console.log(`Now playing: ${filename}`);
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



// -------------------------------------------------------
// Managers storage
// -------------------------------------------------------

const managers = new Map<string, GuildVoiceManager>();

export function useVoice(guildId: string): GuildVoiceManager {
    if (!managers.has(guildId)) {
        managers.set(guildId, new GuildVoiceManager(guildId));
    }
    return managers.get(guildId)!;
}