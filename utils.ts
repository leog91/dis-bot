import fs from "fs";
import type { TextBasedChannel } from "discord.js";

// Type for commands
// export type Command = "cat" | "age"; // Add more commands as needed

// Define the folder paths with a type annotation
const folderPaths: Record<string, string> = {
    cat: "./assets/images/meme/cat/",
    age: "./assets/audio/age/",
};

// Use a structural type to avoid cross-module discord.js type identity mismatches.
type ImageChannel = Pick<TextBasedChannel, "send">;

export const sendRandomImg = async (command: string, channel: ImageChannel): Promise<void> => {
    const assets: string[] = fs.readdirSync(folderPaths[command]);

    if (assets.length === 0) {
        console.error(`No images found in folder: ${folderPaths[command]}`);
        return;
    }

    const randomAsset = assets[Math.floor(Math.random() * assets.length)];

    // Await the send so TypeScript knows this is async
    await channel.send({
        files: [folderPaths[command] + randomAsset],
    });
};
export const randomAsset = (command: string): string => {
    const assets: string[] = fs.readdirSync(folderPaths[command]);

    // Check if there are assets available
    if (assets.length === 0) {
        console.error(`No assets found in folder: ${folderPaths[command]}`);
        return ""; // Return an empty string if no assets are found
    }

    // Return a random asset path
    // return folderPaths[command] + assets[Math.floor(Math.random() * assets.length)];
    return assets[Math.floor(Math.random() * assets.length)];
};

