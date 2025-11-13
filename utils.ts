import fs from "fs";
import { TextChannel } from "discord.js"; // Importing TextChannel for type annotation

// Type for commands
// export type Command = "cat" | "age"; // Add more commands as needed

// Define the folder paths with a type annotation
const folderPaths: Record<string, string> = {
    cat: "./assets/images/meme/cat/",
    age: "./assets/audio/age/",
};

export const sendRandomImg = (command: string, channel: TextChannel): void => {
    const assets: string[] = fs.readdirSync(folderPaths[command]);

    // Check if there are assets to send
    if (assets.length === 0) {
        console.error(`No images found in folder: ${folderPaths[command]}`);
        return; // Exit the function if there are no assets
    }

    // Send a random image from the assets folder
    const randomAsset = assets[Math.floor(Math.random() * assets.length)];
    channel.send({
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


