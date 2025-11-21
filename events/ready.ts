import { Client } from "discord.js";


export default async function onReady(client: Client) {
    console.log(`🤖 Logged in as ${client.user?.tag}`);


    client.user?.setPresence({
        activities: [
            { name: ">> aiuda", type: 2 } // Listening
        ],
        status: "invisible"
    });

    // Pre-fetch guilds to speed up later operations
    client.guilds.fetch();

    console.log("✨ Bot is ready");
}