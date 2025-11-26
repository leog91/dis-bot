import { Client } from "discord.js";
import { bf6Service } from "../services/bf6.service";


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


    await bf6Service.load();
    if (bf6Service.isExpired()) {
        bf6Service.update();
    }

    //6 hours
    setInterval(() => bf6Service.update(), 1000 * 60 * 60 * 6);

}