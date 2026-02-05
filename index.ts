import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import { join } from "path";
import onMessage from "./events/messageCreate";
import onReady from "./events/ready";
import { loadCommands } from "./commands/commandLoader";
import onVoiceStateUpdate from "./events/voiceStateUpdate";
import interactionCreate from "./events/interactionCreate";


dotenv.config();

const privateAssetsDir = process.env.ASSETS_PRIVATE_DIR;
const privateCommandsDir = process.env.PRIVATE_COMMANDS_DIR;
if (privateAssetsDir) {
    if (!fs.existsSync(privateAssetsDir)) {
        console.warn(`[assets] ASSETS_PRIVATE_DIR not found: ${privateAssetsDir}`);
    } else {
        const audioDir = join(privateAssetsDir, "audio");
        if (!fs.existsSync(audioDir)) {
            console.warn(`[assets] Missing audio folder in ASSETS_PRIVATE_DIR: ${audioDir}`);
        }
    }
}

if (privateCommandsDir && !fs.existsSync(privateCommandsDir)) {
    console.warn(`[commands] PRIVATE_COMMANDS_DIR not found: ${privateCommandsDir}`);
}



const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});



// extend the client at runtime (safe in JS/Bun)
declare module "discord.js" {
    interface Client {
        commands: Map<string, any>;
    }
}



let commands: Map<string, any>;

(async () => {
    commands = await loadCommands(`${__dirname}/commands`);

    if (privateCommandsDir && fs.existsSync(privateCommandsDir)) {
        const privateCommands = await loadCommands(privateCommandsDir);
        privateCommands.forEach((cmd, name) => commands.set(name, cmd));
    }

    client.commands = commands;
    client.on("messageCreate", (msg) => onMessage(msg, commands));
    client.on("clientReady", () => onReady(client));
    client.on("voiceStateUpdate", (oldState, newState) => onVoiceStateUpdate(oldState, newState));
    client.on("interactionCreate", interactionCreate);



    await client.login(process.env.BOT_TOKEN);
})();
