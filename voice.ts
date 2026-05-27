
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
import { join, dirname, basename, isAbsolute } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AUDIO_ROOT = join(__dirname, "assets", "audio");
const PRIVATE_AUDIO_ROOT = process.env.ASSETS_PRIVATE_DIR
    ? join(process.env.ASSETS_PRIVATE_DIR, "audio")
    : null;

const hasExtension = (filename: string): boolean => /\.[a-z0-9]+$/i.test(filename);

const getAudioRoots = (): string[] => {
    const roots: string[] = [];
    if (PRIVATE_AUDIO_ROOT && fs.existsSync(PRIVATE_AUDIO_ROOT)) {
        roots.push(PRIVATE_AUDIO_ROOT);
    }
    roots.push(AUDIO_ROOT);
    return roots;
};

const formatAudioPathForLog = (filePath: string): string => {
    for (const root of getAudioRoots()) {
        const prefix = root.endsWith("/") ? root : `${root}/`;
        if (filePath.startsWith(prefix)) {
            return filePath.slice(prefix.length);
        }
    }
    return filePath;
};

const listAudioFiles = (folderRel: string): string[] => {
    const files: string[] = [];
    for (const root of getAudioRoots()) {
        const folderPath = join(root, folderRel);
        if (!fs.existsSync(folderPath)) continue;
        const entries = fs.readdirSync(folderPath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile()) continue;
            files.push(join(folderPath, entry.name));
        }
    }
    return files;
};

const findByBasename = (name: string): string | null => {
    const matches: string[] = [];

    const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            const base = basename(full);
            const baseNoExt = base.replace(/\.[a-z0-9]+$/i, "");
            if (base === name || baseNoExt === name) {
                matches.push(full);
            }
        }
    };

    for (const root of getAudioRoots()) {
        if (fs.existsSync(root)) {
            walk(root);
        }
    }

    if (matches.length === 0) return null;
    matches.sort();

    if (matches.length > 1) {
        console.warn(`Multiple audio files match "${name}". Using: ${matches[0]}`);
    }

    return matches[0];
};

const resolveAudioPath = (input: string): string | null => {
    const normalized = input.replace(/\\/g, "/").trim();

    if (isAbsolute(normalized) && fs.existsSync(normalized)) {
        return normalized;
    }

    if (normalized.includes("/")) {
        for (const root of getAudioRoots()) {
            if (hasExtension(normalized)) {
                const direct = join(root, normalized);
                if (fs.existsSync(direct)) return direct;
                continue;
            }

            const candidates = [".mp3", ".ogg", ".wav"].map((ext) =>
                join(root, `${normalized}${ext}`)
            );

            const found = candidates.find((candidate) => fs.existsSync(candidate));
            if (found) return found;
        }
    } else {
        for (const root of getAudioRoots()) {
            const directCandidate = hasExtension(normalized)
                ? join(root, normalized)
                : join(root, `${normalized}.mp3`);

            if (fs.existsSync(directCandidate)) return directCandidate;
        }
    }

    if (!hasExtension(normalized)) {
        const found = findByBasename(normalized);
        if (found) return found;
    }

    return null;
};


export class GuildVoiceManager {
    guildId: string;
    connection: VoiceConnection | null = null;
    player: AudioPlayer | null = null;
    randomQueues = new Map<string, string[]>();
    queue: string[] = [];
    currentMsg: Message | null = null;

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
            this.player.on(AudioPlayerStatus.Idle, () => {
                if (this.queue.length > 0 && this.currentMsg) {
                    const nextFile = this.queue.shift()!;
                    this.playResource(nextFile);
                }
            });
            this.player.on("error", (err) => {
                console.error("Audio player error:", err);
                if (this.currentMsg) {
                    this.currentMsg.reply("⚠️ Audio playback error.");
                }
                if (this.queue.length > 0 && this.currentMsg) {
                    const nextFile = this.queue.shift()!;
                    this.playResource(nextFile);
                }
            });
            this.connection.subscribe(this.player);
        }

        return this.player;
    }

    private playResource(filePath: string) {
        if (!this.player) return;
        const inputType = filePath.endsWith(".ogg")
            ? StreamType.OggOpus
            : undefined;
        const resource = createAudioResource(filePath, { inputType });
        this.player.play(resource);
    }


    async playTTS(msg: Message, text: string, lang = "en") {
        let player;

        try {
            player = await this.ensureReady(msg);
        } catch (err: any) {
            await msg.reply("⚠️ " + err.message);
            return;
        }

        const tempFile = join(__dirname, `./tts-${randomUUID()}.mp3`);

        try {
            let urls: string[];
            if (text.length > 200) {
                const results = googleTTS.getAllAudioUrls(text, {
                    lang,
                    slow: false,
                    host: "https://translate.google.com",
                });
                urls = results.map((r) => r.url);
            } else {
                urls = [
                    googleTTS.getAudioUrl(text, {
                        lang,
                        slow: false,
                        host: "https://translate.google.com",
                    }),
                ];
            }

            let fullBuffer = Buffer.alloc(0);
            for (const url of urls) {
                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`Failed to fetch TTS audio: ${res.status}`);
                }
                const buffer = Buffer.from(await res.arrayBuffer());
                fullBuffer = Buffer.concat([fullBuffer, buffer]);
            }
            fs.writeFileSync(tempFile, fullBuffer);
        } catch (err: any) {
            console.error("TTS generation error:", err);
            await msg.reply("⚠️ Failed to generate TTS audio.");
            fs.unlink(tempFile, () => {});
            return;
        }

        const resource = createAudioResource(tempFile);

        // TTS interrupts any queued playback
        this.queue = [];
        this.currentMsg = msg;
        player.play(resource);

        player.once(AudioPlayerStatus.Idle, () => {
            fs.unlink(tempFile, () => { });
        });

        player.once("error", (err) => {
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

        const filePath = isRandom
            ? resolveAudioPath(`age/${filename}`)
            : resolveAudioPath(filename);

        if (!filePath) {
            return msg.reply("⚠️ Audio file not found.");
        }

        // Single-shot playback clears any existing queue
        this.queue = [];
        this.currentMsg = msg;
        this.playResource(filePath);
    }

    async playRandom(msg: Message, folder: string) {
        const files = listAudioFiles(folder);
        if (files.length === 0) {
            await msg.reply("⚠️ No audio files found in that folder.");
            return;
        }

        const randomFile = files[Math.floor(Math.random() * files.length)];
        await this.play(msg, randomFile);
    }

    async playFromFolder(msg: Message, folder: string, search: string): Promise<boolean> {
        const files = listAudioFiles(folder);
        if (files.length === 0) {
            await msg.reply("⚠️ No audio files found in that folder.");
            return false;
        }

        if (search.toLowerCase() === "all") {
            this.queue = [...files];
            this.currentMsg = msg;
            await this.ensureReady(msg);
            const firstFile = this.queue.shift()!;
            this.playResource(firstFile);
            return true;
        }

        const searchLower = search.toLowerCase();
        const match = files.find((f) => {
            const base = basename(f).toLowerCase();
            return base.includes(searchLower);
        });

        if (!match) {
            await msg.reply(
                `⚠️ No audio file matching "${search}" found in folder "${folder}".`
            );
            return false;
        }

        await this.play(msg, match);
        return true;
    }

    async playRandomNoRepeat(msg: Message, folder: string): Promise<string | null> {
        const nextFile = this.nextFromQueue(folder);
        if (!nextFile) {
            await msg.reply("⚠️ No audio files found in that folder.");
            return null;
        }

        await this.play(msg, nextFile);
        return formatAudioPathForLog(nextFile);
    }

    private nextFromQueue(folder: string): string | null {
        let queue = this.randomQueues.get(folder);

        if (!queue || queue.length === 0) {
            const files = listAudioFiles(folder);
            if (files.length === 0) return null;

            const shuffled = [...files];
            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            queue = shuffled;
            this.randomQueues.set(folder, queue);
        }

        return queue.shift() ?? null;
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
        this.queue = [];
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
