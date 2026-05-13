import { promises as fs } from "fs";
import path from "path";
import type { Message, MessageCreateOptions } from "discord.js";
import ffmpegPath from "ffmpeg-static";

declare const Bun: any;

type YtDlpAttempt = {
    format?: string;
    extractorArg?: string;
};

type CommandResult = {
    stdoutText: string;
    stderrText: string;
    exitCode: number;
};

type MessageChannelLike = {
    send: (options: string | MessageCreateOptions) => Promise<unknown>;
};

type SentMessageLike = {
    edit: (options: string | MessageCreateOptions) => Promise<unknown>;
    delete: () => Promise<unknown>;
};

export type VidSourceInfo = {
    isTwitterLike: boolean;
    isRedditLike: boolean;
};

export type RedditVideoResult =
    | { sent: true }
    | { sent: false; notice?: string };

export type VidProgressMessage = {
    update: (content: string) => Promise<void>;
    remove: () => Promise<void>;
};

const DEFAULT_DISCORD_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const DISCORD_UPLOAD_HEADROOM_BYTES = 512 * 1024;
const ffmpegBinary = ffmpegPath as unknown as string | null;
const ytdlpBinary = path.resolve(process.cwd(), "yt-dlp");

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const pickBestDirectUrl = (stdoutText: string) => {
    const urls = stdoutText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const mp4Url = urls.find((line) => line.includes(".mp4"));
    if (mp4Url) {
        return mp4Url;
    }

    const nonPlaylistUrl = urls.find((line) => !line.includes(".m3u8"));
    if (nonPlaylistUrl) {
        return nonPlaylistUrl;
    }

    return urls[0] ?? "";
};

const runCommand = async (cmd: string[]): Promise<CommandResult> => {
    const process = Bun.spawn(cmd, {
        stdout: "pipe",
        stderr: "pipe",
    });
    const [stdoutText, stderrText, exitCode] = await Promise.all([
        new Response(process.stdout).text(),
        new Response(process.stderr).text(),
        process.exited,
    ]);

    return {
        stdoutText: stdoutText.trim(),
        stderrText: stderrText.trim(),
        exitCode,
    };
};

const getSendChannel = (msg: Message) => msg.channel as MessageChannelLike;

const toSentMessageLike = (value: unknown) => value as SentMessageLike;

const getUploadLimitBytes = (msg: Message) =>
    DEFAULT_DISCORD_UPLOAD_LIMIT_BYTES;

const parseDurationSeconds = (ffmpegText: string) => {
    const match = ffmpegText.match(/Duration:\s+(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
    if (!match) {
        return 0;
    }

    const [, hours, minutes, seconds] = match;
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
};

const getMediaDurationSeconds = async (inputFile: string) => {
    if (!ffmpegBinary) {
        return 0;
    }

    const result = await runCommand([ffmpegBinary, "-i", inputFile]);
    return parseDurationSeconds(result.stderrText);
};

const compressVideoToFit = async (inputFile: string, uploadLimitBytes: number) => {
    if (!ffmpegBinary) {
        return "";
    }

    const durationSeconds = await getMediaDurationSeconds(inputFile);
    if (!durationSeconds) {
        return "";
    }

    const safeTargetBytes = Math.max(uploadLimitBytes - DISCORD_UPLOAD_HEADROOM_BYTES, uploadLimitBytes / 2);
    const totalBitrateKbps = Math.max(Math.floor((safeTargetBytes * 8) / durationSeconds / 1000), 250);
    const attempts = [
        { suffix: "compressed-1", audioKbps: 96, maxWidth: 1280, videoFactor: 1 },
        { suffix: "compressed-2", audioKbps: 64, maxWidth: 960, videoFactor: 0.82 },
        { suffix: "compressed-3", audioKbps: 48, maxWidth: 720, videoFactor: 0.65 },
    ];

    for (const attempt of attempts) {
        const outputFile = inputFile.replace(/\.mp4$/i, `-${attempt.suffix}.mp4`);
        const rawVideoKbps = Math.floor((totalBitrateKbps - attempt.audioKbps - 24) * attempt.videoFactor);
        const videoKbps = Math.max(rawVideoKbps, 180);
        const result = await runCommand([
            ffmpegBinary,
            "-y",
            "-i", inputFile,
            "-vf", `scale='min(${attempt.maxWidth},iw)':-2`,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-b:v", `${videoKbps}k`,
            "-maxrate", `${Math.max(Math.floor(videoKbps * 1.2), videoKbps)}k`,
            "-bufsize", `${Math.max(videoKbps * 2, 360)}k`,
            "-c:a", "aac",
            "-ac", "2",
            "-b:a", `${attempt.audioKbps}k`,
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p",
            outputFile,
        ]);

        if (result.exitCode !== 0) {
            await fs.unlink(outputFile).catch(() => {});
            continue;
        }

        const outputStat = await fs.stat(outputFile).catch(() => null);
        if (outputStat && outputStat.size <= uploadLimitBytes) {
            return outputFile;
        }

        await fs.unlink(outputFile).catch(() => {});
    }

    return "";
};

const runYtDlpGetUrl = async (url: string, attempt: YtDlpAttempt = {}) => {
    const cmd = [
        ytdlpBinary,
        "-g",
        "--no-warnings",
        "--extractor-retries", "3",
    ];

    if (attempt.format) {
        cmd.push("-f", attempt.format);
    }

    if (attempt.extractorArg) {
        cmd.push("--extractor-args", attempt.extractorArg);
    }

    cmd.push(url);

    return runCommand(cmd);
};

const runYtDlpDownload = async (url: string, outputTemplate: string) => {
    const cmd = [
        ytdlpBinary,
        "-f", "bv*+ba/b",
        "--merge-output-format", "mp4",
        "--no-warnings",
        "--extractor-retries", "3",
        "-o", outputTemplate,
    ];

    if (ffmpegBinary) {
        cmd.push("--ffmpeg-location", ffmpegBinary);
    }

    cmd.push(url);

    return runCommand(cmd);
};

const findDownloadedFile = async (directory: string, prefix: string) => {
    const entries = await fs.readdir(directory);
    const matchingFiles = entries
        .filter((entry) => entry.startsWith(prefix))
        .sort()
        .reverse();

    if (matchingFiles.length === 0) {
        return "";
    }

    return path.join(directory, matchingFiles[0]);
};

const shortenUrl = async (url: string) => {
    const shortRes = await fetch(
        `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`
    );
    return shortRes.text();
};

const getShorterUrlIfAvailable = async (url: string) => {
    try {
        const shortenedUrl = (await shortenUrl(url)).trim();

        if (!shortenedUrl) {
            return url;
        }

        try {
            const parsedShortUrl = new URL(shortenedUrl);
            if (parsedShortUrl.hostname !== "is.gd") {
                return url;
            }
        } catch {
            return url;
        }

        return shortenedUrl.length < url.length ? shortenedUrl : url;
    } catch (err) {
        console.error("Failed to shorten URL:", err);
        return url;
    }
};

const buildAttempts = ({ isTwitterLike, isRedditLike }: VidSourceInfo) => {
    const defaultAttempts: YtDlpAttempt[] = [
        { format: "b" },
        { format: "best" },
        { format: "bv*+ba/b" },
        {},
    ];
    const redditAttempts: YtDlpAttempt[] = [
        { format: "b[ext=mp4]" },
        { format: "best[ext=mp4]" },
        { format: "bv*[ext=mp4]" },
        { format: "b" },
        { format: "best" },
        {},
    ];

    const twitterExtractorArgs = [undefined, "twitter:api=legacy", "twitter:api=syndication"];
    const baseAttempts = isRedditLike ? redditAttempts : defaultAttempts;

    if (!isTwitterLike) {
        return baseAttempts;
    }

    return twitterExtractorArgs.flatMap((extractorArg) =>
        baseAttempts.map((attempt) => ({
            ...attempt,
            extractorArg,
        }))
    );
};

export const getVidSourceInfo = (url: string): VidSourceInfo => {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    return {
        isTwitterLike: host.includes("twitter.com") || host.includes("x.com"),
        isRedditLike:
            host.includes("reddit.com") || host.includes("redd.it") || host.includes("v.redd.it"),
    };
};

export const deleteOriginalMessage = async (msg: Message) => {
    if (msg.deletable) {
        await msg.delete().catch(() => {});
    }
};

export const createVidProgressMessage = async (msg: Message, content: string): Promise<VidProgressMessage> => {
    const channel = getSendChannel(msg);
    const sentMessage = toSentMessageLike(await channel.send(content));

    return {
        update: async (nextContent: string) => {
            await sentMessage.edit(nextContent).catch(() => {});
        },
        remove: async () => {
            await sentMessage.delete().catch(() => {});
        },
    };
};

export const sendVidResponse = async (
    msg: Message,
    content: string,
    notice?: string,
    progress?: VidProgressMessage
) => {
    const channel = getSendChannel(msg);

    await progress?.remove();

    await channel.send(`by ${msg.author}:`);

    if (notice) {
        await channel.send(notice);
    }

    await channel.send(content);
    await deleteOriginalMessage(msg);
};

export const trySendRedditVideo = async (
    msg: Message,
    url: string,
    progress?: VidProgressMessage
): Promise<RedditVideoResult> => {
    const tempDir = path.resolve(process.cwd(), "temp");
    const filePrefix = `reddit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const outputTemplate = path.join(tempDir, `${filePrefix}.%(ext)s`);
    const uploadLimitBytes = getUploadLimitBytes(msg);

    await progress?.update("Downloading Reddit video and audio...");
    await fs.mkdir(tempDir, { recursive: true });

    const result = await runYtDlpDownload(url, outputTemplate);
    const downloadedFile = await findDownloadedFile(tempDir, filePrefix);

    if (result.exitCode !== 0 || !downloadedFile) {
        if (downloadedFile) {
            await fs.unlink(downloadedFile).catch(() => {});
        }

        console.error(result.stderrText || `yt-dlp exited with code ${result.exitCode}`);
        return { sent: false };
    }

    let fileToUpload = downloadedFile;

    try {
        let fileStat = await fs.stat(downloadedFile);

        if (fileStat.size > uploadLimitBytes) {
            await progress?.update("Compressing video to fit Discord...");
            const compressedFile = await compressVideoToFit(downloadedFile, uploadLimitBytes);
            if (compressedFile) {
                fileToUpload = compressedFile;
                fileStat = await fs.stat(compressedFile);
            }
        }

        if (fileStat.size > uploadLimitBytes) {
            console.error(
                `Merged Reddit video is too large to upload: ${fileToUpload} (${formatMb(fileStat.size)})`
            );
            return {
                sent: false,
                notice: `No lo puedo subir con audio porque pesa ${formatMb(fileStat.size)}. Te paso el link.`,
            };
        }

        const fileBuffer = await fs.readFile(fileToUpload);
        const channel = getSendChannel(msg);

        await progress?.update("Uploading video...");
        await channel.send(`by ${msg.author}:`);
        await channel.send({
            files: [{
                attachment: fileBuffer,
                name: path.basename(fileToUpload),
            }],
        });
        await progress?.remove();
        await deleteOriginalMessage(msg);

        return { sent: true };
    } finally {
        await fs.unlink(downloadedFile).catch(() => {});
        if (fileToUpload !== downloadedFile) {
            await fs.unlink(fileToUpload).catch(() => {});
        }
    }
};

export const resolveVidOutputUrl = async (url: string, sourceInfo: VidSourceInfo) => {
    const attempts = buildAttempts(sourceInfo);
    let directUrl = "";
    let lastError = "";

    for (const attempt of attempts) {
        const result = await runYtDlpGetUrl(url, attempt);
        if (result.stdoutText) {
            directUrl = pickBestDirectUrl(result.stdoutText);
            break;
        }
        lastError = result.stderrText || `yt-dlp exited with code ${result.exitCode}`;
    }

    if (!directUrl) {
        console.error(lastError);
        directUrl = url;
    }

    return getShorterUrlIfAvailable(directUrl);
};
