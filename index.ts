import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import onMessage from "./events/messageCreate";
import onReady from "./events/ready";
import { loadCommands } from "./commands/commandLoader";
import onVoiceStateUpdate from "./events/voiceStateUpdate";

dotenv.config();



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

    client.commands = commands;
    client.on("messageCreate", (msg) => onMessage(msg, commands));
    client.on("clientReady", () => onReady(client));
    client.on("voiceStateUpdate", (oldState, newState) => onVoiceStateUpdate(oldState, newState));

    await client.login(process.env.BOT_TOKEN);
})();

