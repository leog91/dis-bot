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

    console.log("\n📡 Connected members in voice channels:");
    for (const guild of client.guilds.cache.values()) {
        const voiceChannels = guild.channels.cache.filter(ch => ch.isVoiceBased());
        for (const channel of voiceChannels.values()) {
            const members = channel.members.filter(m => !m.user.bot);
            if (members.size > 0) {
                console.log(`  ${guild.name} - ${channel.name}:`);
                members.forEach(member => {
                    const flags: string[] = [];
                    if (member.voice.selfMute || member.voice.serverMute) flags.push("muted");
                    if (member.voice.selfDeaf || member.voice.serverDeaf) flags.push("deafened");
                    const state = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
                    console.log(`    • ${member.user.tag}${state}`);
                });
            }
        }
    }
    console.log("");


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
