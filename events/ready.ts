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
        await bf6Service.update();
    }

    //6 hours
    setInterval(() => {
        bf6Service.update().catch((error) => {
            console.error("❌ Scheduled BF6 update failed:", error);
        });
    }, 1000 * 60 * 60 * 6);

}
