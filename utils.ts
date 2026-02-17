import fs from "fs";
import path from "path";
import type { MessageCreateOptions } from "discord.js";

// Type for commands
// export type Command = "cat" | "age"; // Add more commands as needed

// Candidate directories per command (old paths + private-assets paths).
const folderPathCandidates: Record<string, string[]> = {
    cat: [
        "assets/images/meme/cat",
        "../dis-bot-assets-private/images/cat",
        "dis-bot-assets-private/images/cat",
        "images/cat",
    ],
    age: [
        "assets/audio/age",
        "../dis-bot-assets-private/audio/age",
        "dis-bot-assets-private/audio/age",
        "audio/age",
    ],
};

const resolveFolderPath = (command: string): string | null => {
    const candidates = folderPathCandidates[command];
    if (!candidates) return null;

    for (const relativePath of candidates) {
        const absolutePath = path.resolve(process.cwd(), relativePath);
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
            return absolutePath;
        }
    }

    return null;
};

// Use a structural type to avoid cross-module discord.js type identity mismatches.
type ImageChannel = {
    send: (options: MessageCreateOptions) => Promise<unknown>;
};

export const sendRandomImg = async (command: string, channel: ImageChannel): Promise<void> => {
    const folderPath = resolveFolderPath(command);
    if (!folderPath) {
        console.error(`No folder found for command "${command}" in known asset locations.`);
        return;
    }

    const assets: string[] = fs.readdirSync(folderPath);

    if (assets.length === 0) {
        console.error(`No images found in folder: ${folderPath}`);
        return;
    }

    const randomAsset = assets[Math.floor(Math.random() * assets.length)];

    // Await the send so TypeScript knows this is async
    await channel.send({
        files: [path.join(folderPath, randomAsset)],
    });
};
export const randomAsset = (command: string): string => {
    const folderPath = resolveFolderPath(command);
    if (!folderPath) {
        console.error(`No folder found for command "${command}" in known asset locations.`);
        return "";
    }

    const assets: string[] = fs.readdirSync(folderPath);

    // Check if there are assets available
    if (assets.length === 0) {
        console.error(`No assets found in folder: ${folderPath}`);
        return ""; // Return an empty string if no assets are found
    }

    // Return a random asset path
    // return folderPaths[command] + assets[Math.floor(Math.random() * assets.length)];
    return assets[Math.floor(Math.random() * assets.length)];
};
