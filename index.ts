// index.ts
import { TextChannel, Client, GatewayIntentBits, Message, Guild } from "discord.js";
import dotenv from "dotenv";
import fs from "fs/promises";



// Define the type for the data parameter
interface SneakerData {
    fullProduct: { productName: string };
    code: string;
    url: string;
}

// Use template literal to format the sneaker information
const sneaker = (data: SneakerData): string =>
    `product: ${data.fullProduct.productName} \n code: ${data.code} \n url >>> ${data.url}`;

dotenv.config();

import {
    voiceFun,
    playSong,
    // playSongBis,
    stop,
    pause,
    resume,
    playRandom,
    changeVoiceChannel,
    leaveVoiceChannelFromGuild as importedLeaveVoiceChannelFromGuild,
} from "./voice.ts";

import { sendRandomImg } from "./utils.ts";
import {
    C_,
} from "./data.ts"; // Adjust based on your actual structure
// import { bf6Rank } from "./utils/bf6rank.ts";

const client: Client<boolean> = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});




export const logger = (...args: (string | number | undefined)[]) => {
    console.log(new Date().toISOString(), "|", args.map(str => str?.toString().trim()).join(' '))

}



// Use await in an async function
(async () => {
    await client.login(process.env.BOT_TOKEN as string);
    client.user?.setActivity("commands >> 'aiuda'");





    let available_bot = true;

    client.on("voiceStateUpdate", async (oldMember, newMember) => {


        logger(oldMember.member?.user.username, " left =>", oldMember.guild.name, ">", oldMember.channel?.name)



        logger(newMember.member?.user.username, " join =>", newMember.guild.name, ">", newMember.channel?.name);


        // Check if the old member is leaving the voice channel
        if (oldMember.channelId && !newMember.channelId) {
            logger(`${oldMember.member?.user.username} has left SERVER [${oldMember.guild.name}]`);
            // Add any additional logic for when a user leaves the voice channel here
        }
    });

    client.on("messageCreate", async (msg: Message) => {
        // Command handling
        if (msg.content === C_.STOP.name) {
            stop(msg);
            return;
        }
        if (msg.content === C_.PAUSE.name) {
            pause(msg);
            return;
        }
        if (msg.content === C_.RESUME.name) {
            resume(msg);
            return;
        }
        if (msg.content === C_.STATUS.name) {
            if (C_.STATUS.permission?.find((u) => u.id === msg.author.id)) {
                msg.reply(available_bot ? "on" : "off");
                msg.react("✅");
            } else {
                msg.react("❌");
            }
            return;
        }
        if (msg.content === C_.ON.name && C_.STATUS.permission?.find((u) => u.id === msg.author.id)) {
            available_bot = true;
            msg.reply("on");
            return;
        }
        if (msg.content === C_.OFF.name && C_.STATUS.permission?.find((u) => u.id === msg.author.id)) {
            available_bot = false;
            msg.reply("off");
            return;
        }
        if (available_bot && msg.content.includes(C_.BOT.name) && !msg.author.bot) {
            msg.reply("BUEN DIA GRUPO");
            return;
        }
        if (available_bot && msg.content === C_.AIUDA.name) {
            let commands: string[] = Object.entries(C_)
                .filter(([, cmd]) => cmd.permission === undefined)
                .map(([, cmd]) => cmd.name);
            msg.reply(commands.join(", "));
            return;
        }

        // Audio command handling
        if (available_bot && msg.content === C_.KNOCK.name) {
            try {
                await playSong("knock1", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
                // logger(error instanceof Error ? error.message : String(error));
            }
            return;
        }
        if (available_bot && msg.content === "followMe") {
            logger("followme>")
            try {
                await changeVoiceChannel(msg)
            } catch (error) {
                console.error(error);
            }

        }





        if (available_bot && msg.content === C_.PUERTA.name) {
            try {
                await playSong("knock2", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
                // logger(error instanceof Error ? error.message : String(error));
            }
            return;
        }

        if (available_bot && msg.content === C_.PIC.name) {
            if (msg.channel instanceof TextChannel) {
                await msg.channel.send({ files: ["./assets/images/garolfa-profile.jpg"] });
            } else {
                await msg.reply("This command can only be used in a text channel.");
            }
            return;
        }

        if (available_bot && msg.content === C_.ALBER.name) {
            if (msg.channel instanceof TextChannel) {
                await msg.channel.send(`han pasado ${Math.floor(Math.random() * 100)} días desde el ultimo bife`);
                const alberImg = [
                    "https://media.tiempodesanjuan.com/p/48241a6e591cec56477be174421c777c/adjuntos/331/imagenes/000/762/0000762150/790x0/smart/albertojpg.jpg",
                    "https://pbs.twimg.com/media/GUf-N3QXcAAfXJQ.jpg",
                    "https://www.clarin.com/img/2022/06/21/tLnSIH08I_720x0__1.jpg",
                    "https://media.lmcipolletti.com/p/be340a12bcd48535d5779ca8eb55d651/adjuntos/195/imagenes/007/483/0007483103/albertojpg.jpg",
                    "https://www.argentina.gob.ar/sites/default/files/alberto_fernandez_presidente_argentino_brinda_datos_con_graficos_sobre_coronavirus_0.jpg",
                ];
                await msg.channel.send({ files: [alberImg[Math.floor(Math.random() * alberImg.length)]] });
            } else {
                await msg.reply("Este comando solo se puede usar en un canal de texto.");
            }
            return;
        }

        if (available_bot && msg.content === C_.CAT.name) {
            if (msg.channel instanceof TextChannel) {
                sendRandomImg("cat", msg.channel);
            } else {
                msg.reply("This command can only be used in a text channel.");
            }
            return;
        }

        //
        if (available_bot && msg.content === "bf6kills") {
            if (!(msg.channel instanceof TextChannel)) {
                await msg.reply("This command can only be used in a text channel.");
                return;
            }

            // await msg.reply("📊 Loading stored BF6 rank data...");

            try {
                const file = await fs.readFile("./bf6rank.json", "utf-8");
                const bfdata = JSON.parse(file);

                const content = bfdata
                    .map((p: any, i: number) => `${p.platformUserHandle} - ${p.kills} kills`)
                    .join("\n");

                await msg.reply(content || "No rank data available yet.");
            } catch (err) {
                console.error("Error reading bf6rank.json:", err);
                // await msg.reply("❌ Rank data file not found or invalid. Try running the update script first.");
            }
        }

        //
        if (available_bot && msg.content === "bf6deaths") {
            if (!(msg.channel instanceof TextChannel)) {
                await msg.reply("This command can only be used in a text channel.");
                return;
            }

            // await msg.reply("📊 Loading stored BF6 rank data...");

            try {
                const file = await fs.readFile("./bf6rank.json", "utf-8");
                const bfdata = JSON.parse(file).sort((a: any, b: any) => b.deaths - a.deaths);

                const content = bfdata
                    .map((p: any, i: number) => `${p.platformUserHandle} - ${p.deaths} deaths`)
                    .join("\n");

                await msg.reply(content || "No rank data available yet.");
            } catch (err) {
                console.error("Error reading bf6rank.json:", err);
                // await msg.reply("❌ Rank data file not found or invalid. Try running the update script first.");
            }
        }


        if (available_bot && msg.content === "bf6revives") {
            if (!(msg.channel instanceof TextChannel)) {
                await msg.reply("This command can only be used in a text channel.");
                return;
            }

            // await msg.reply("📊 Loading stored BF6 rank data...");

            try {
                const file = await fs.readFile("./bf6rank.json", "utf-8");
                const bfdata = JSON.parse(file).sort((a: any, b: any) => b.revives - a.revives);

                const content = bfdata
                    .map((p: any, i: number) => `${p.platformUserHandle} - ${p.revives} revives`)
                    .join("\n");

                await msg.reply(content || "No rank data available yet.");
            } catch (err) {
                console.error("Error reading bf6rank.json:", err);
                // await msg.reply("❌ Rank data file not found or invalid. Try running the update script first.");
            }
        }


        //test

        if (available_bot && msg.content === "bf6score") {
            if (!(msg.channel instanceof TextChannel)) {
                await msg.reply("This command can only be used in a text channel.");
                return;
            }

            // await msg.reply("📊 Loading stored BF6 rank data...");

            try {
                const file = await fs.readFile("./bf6rank.json", "utf-8");
                const bfdata = JSON.parse(file).sort((a: any, b: any) => b.score - a.score);

                const content = bfdata
                    .map((p: any, i: number) => `${p.platformUserHandle} - ${p.score} `)
                    .join("\n");

                await msg.reply(content || "No rank data available yet.");
            } catch (err) {
                console.error("Error reading bf6rank.json:", err);
                // await msg.reply("❌ Rank data file not found or invalid. Try running the update script first.");
            }
        }


        //test

        if (available_bot && msg.content === "bf6rank") {
            if (!(msg.channel instanceof TextChannel)) {
                await msg.reply("This command can only be used in a text channel.");
                return;
            }

            // await msg.reply("📊 Loading stored BF6 rank data...");

            try {
                const file = await fs.readFile("./bf6rank.json", "utf-8");
                const bfdata = JSON.parse(file).sort((a: any, b: any) => b.careerPlayerRank - a.careerPlayerRank);

                const content = bfdata
                    .map((p: any, i: number) => `${p.platformUserHandle} - Rank ${p.careerPlayerRank} `)
                    .join("\n");

                await msg.reply(content || "No rank data available yet.");
            } catch (err) {
                console.error("Error reading bf6rank.json:", err);
                // await msg.reply("❌ Rank data file not found or invalid. Try running the update script first.");
            }
        }

        //test
        if (available_bot && msg.content === "bf6timePlayed") {
            if (!(msg.channel instanceof TextChannel)) {
                await msg.reply("This command can only be used in a text channel.");
                return;
            }

            // await msg.reply("📊 Loading stored BF6 rank data...");

            try {
                const file = await fs.readFile("./bf6rank.json", "utf-8");
                const bfdata = JSON.parse(file).sort((a: any, b: any) => b.timePlayedValue - a.timePlayedValue);

                const content = bfdata
                    .map((p: any, i: number) => `${p.platformUserHandle} - Rank ${p.timePlayedDisplay} `)
                    .join("\n");

                await msg.reply(content || "No rank data available yet.");
            } catch (err) {
                console.error("Error reading bf6rank.json:", err);
                // await msg.reply("❌ Rank data file not found or invalid. Try running the update script first.");
            }
        }




        //

        if (available_bot && msg.content === C_.LAS_QUIERO.name) {
            try {
                await playSong("lasquiero", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
                // logger(error instanceof Error ? error.message : String(error));
            }
            return;
        }


        if (available_bot && msg.content === "pase") {
            try {
                voiceFun(msg);
                await playSong("ELPASEDESPOCK", msg);
            } catch (error) {
                console.error(error);
                // logger(error instanceof Error ? error.message : String(error));
            }
        }


        if (available_bot && msg.content === C_.PAIN.name) {
            try {
                voiceFun(msg);
                await playRandom("age", msg);

            } catch (error) {
                console.error(error);
                logger(error instanceof Error ? error.message : String(error));
            }
            return;
        }

        if (available_bot && msg.content === C_.CACHETE.name
            // && C_.INCONDICIONAL.permission?.find((g) => g.id === msg.guildId)

        ) {
            try {
                voiceFun(msg);
                await playSong("rulo_suelta_cachete", msg);

            } catch (error) {
                console.error(error);
                // logger(error instanceof Error ? error.message : String(error));
            }
            return;
        }


        if (available_bot && msg.content === C_.ULTRAVIOLETA.name
        ) {
            try {
                voiceFun(msg);
                await playSong("rayos-ultravioleta", msg);

            } catch (error) {
                console.error(error);
                // logger(error instanceof Error ? error.message : String(error));
            }
            return;
        }



        if (available_bot && msg.content === C_.INCONDICIONAL.name
            // && C_.INCONDICIONAL.permission?.find((g) => g.id === msg.guildId)

        ) {
            try {
                voiceFun(msg);
                await playSong("giraldo+de+ayer-001", msg);

            } catch (error) {
                console.error(error);
                logger(error instanceof Error ? error.message : String(error));
            }
            return;
        }


        if (available_bot && msg.content === C_.DIENTES.name && C_.DIENTES.permission?.find((g) => g.id === msg.guildId)) {
            try {
                voiceFun(msg);
                await playSong("dientes", msg);

            } catch (error) {
                console.error(error);
                // logger(error instanceof Error ? error.message : String(error));
            }
            return;
        }

        if (available_bot && msg.content === C_.BUD.name && C_.BUD.permission?.find((g) => g.id === msg.guildId)) {
            try {
                voiceFun(msg);
                await playSong("BUDWAIZA", msg);

            } catch (error) {
                console.error(error);
            }
            return;
        }

        if (available_bot && msg.content === C_.MUNDO.name && C_.MUNDO.permission?.find((g) => g.id === msg.guildId)) {
            try {
                voiceFun(msg);
                await playSong("giraldoypabloc", msg);

            } catch (error) {
                console.error(error);
                // logger(error instanceof Error ? error.message : String(error));
            }
            return;
        }


    });
})();

client.on("clientReady", async () => {
    logger("Discord.js client is ready!");
});



// Store timeouts for each guild
const guildTimeouts = new Map<string, NodeJS.Timeout>();

client.on("voiceStateUpdate", async (oldState, newState) => {
    const guildId = oldState.guild.id;
    const channel = oldState.channel;

    // Clear existing timeout if there is one
    if (guildTimeouts.has(guildId)) {
        clearTimeout(guildTimeouts.get(guildId));
        guildTimeouts.delete(guildId);
    }

    if (channel?.members.size === 2) {
        console.log("alone")
        const members = channel.members.map(m => m.user.username);
        console.log(members.length)
        const isAloneWithBot = members.includes("Garolfa") && members.length === 2;

        if (isAloneWithBot) {
            // Set 5 minute timeout before disconnecting
            const timeout = setTimeout(() => {
                importedLeaveVoiceChannelFromGuild(oldState.guild);
                guildTimeouts.delete(guildId);
            }, 5 * 60 * 1000); // 5 minutes in milliseconds

            guildTimeouts.set(guildId, timeout);
        }
    }
});

// Cleanup timeouts when bot leaves
function leaveVoiceChannelFromGuild(guild: Guild) {
    if (guildTimeouts.has(guild.id)) {
        clearTimeout(guildTimeouts.get(guild.id));
        guildTimeouts.delete(guild.id);
    }
    // ...existing leave logic...
}