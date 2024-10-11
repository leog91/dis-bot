// import { join, dirname } from "path";
// // import { Low, JSONFile } from "lowdb"; // Uncomment if using lowdb
// import { fileURLToPath } from "url";
// import { scrapper } from "./utils/scrapper.js";
// import { TextChannel, Client, GatewayIntentBits, Message } from "discord.js";

// const __dirname = dirname(fileURLToPath(import.meta.url));

// // Define the type for the data parameter
// interface SneakerData {
//     fullProduct: { productName: string };
//     code: string;
//     url: string;
// }

// // Use template literal to format the sneaker information
// const sneaker = (data: SneakerData): string =>
//     `product:${data.fullProduct.productName} \n code:${data.code}  \n url >>> ${data.url}`;

// import dotenv from "dotenv";
// dotenv.config();

// import {
//     voiceFun,
//     playSong,
//     playSongBis,
//     stop,
//     pause,
//     resume,
//     playRandom,
// } from "./voice.ts";

// import { sendRandomImg } from "./utils.ts";
// import {
//     C_,
//     U_,
//     findUser,
//     isBytes,
//     isTestGuild,
//     isWanna,
//     LEOG,
//     GD92,
//     MAVE,
//     DREVI,
//     TINCHO,
//     EZEQ,
//     PABLOC,
//     ANDY,
// } from "./data.ts";

// const client: Client<boolean> = new Client({
//     intents: [
//         GatewayIntentBits.Guilds,
//         GatewayIntentBits.GuildMessages,
//         GatewayIntentBits.MessageContent,
//         GatewayIntentBits.GuildVoiceStates,
//     ],
// });

// // Use await in an async function
// (async () => {
//     await client.login(process.env.BOT_TOKEN as string);

//     client.user?.setActivity("commands >> 'aiuda'");

//     let available_bot = true;
//     let voice_enable = true;

//     client.on("voiceStateUpdate", async (oldMember, newMember) => {
//         console.log("oldMember", oldMember.member?.user.username);

//         const channel = await client.channels.fetch("233725944911626240");

//         if (oldMember.guild.id === "233725944911626240") {
//             // Additional logic can go here
//         }
//     });

//     client.on("messageCreate", async (msg: Message) => {
//         if (msg.content === C_.STOP.name) {
//             stop();
//         }
//         if (msg.content === C_.PAUSE.name) {
//             pause();
//         }
//         if (msg.content === C_.RESUME.name) {
//             resume();
//         }
//         if (msg.content === C_.STATUS.name) {
//             if (C_.STATUS.permission?.find((u) => u.id === msg.author.id)) {
//                 msg.reply(available_bot ? "on" : "off");
//                 msg.react("✅");
//             } else {
//                 msg.react("❌");
//             }
//             return;
//         }
//         if (
//             msg.content === C_.ON.name &&
//             C_.STATUS.permission?.find((u) => u.id === msg.author.id)
//         ) {
//             available_bot = true;
//             msg.reply("on");
//         }
//         if (
//             msg.content === C_.OFF.name &&
//             C_.STATUS.permission?.find((u) => u.id === msg.author.id)
//         ) {
//             available_bot = false;
//             msg.reply("off");
//         }
//         if (available_bot && msg.content.includes(C_.BOT.name) && !msg.author.bot) {
//             msg.reply("BUEN DIA GRUPO");
//         }

//         if (available_bot && msg.content === C_.AIUDA.name) {
//             let commands: string[] = Object.entries(Object.entries(C_).map((c) => c[1]))
//                 .map((q) => q[1])
//                 .filter((x) => x.permission === undefined)
//                 .map((c) => c.name);

//             commands = [
//                 ...commands,
//                 ...Object.entries(Object.entries(C_).map((c) => c[1]))
//                     .map((q) => q[1])
//                     .filter((x) => x.permission && x.permission.find((g) => g.id === msg.guildId))
//                     .map((c) => c.name),
//             ];

//             msg.reply(commands.join(", ")); // Join the array into a string when replying
//         }

//         if (available_bot && msg.content === C_.KNOCK.name) {
//             const dateA = new Date();
//             try {
//                 await playSongBis("knock1");
//                 const dateB = new Date();
//                 console.log("milis =>", dateB.getTime() - dateA.getTime(), "knock1");
//                 voiceFun(msg);
//             } catch (error) {
//                 console.error(error);
//             }
//         }
//         if (available_bot && msg.content === C_.PUERTA.name) {
//             console.log("puertaaa");
//             try {
//                 await playSongBis("knock2");
//                 voiceFun(msg);
//             } catch (error) {
//                 console.error(error);
//             }
//         }

//         if (available_bot && msg.content === C_.PIC.name) {
//             // Check if the channel is a TextChannel
//             if (msg.channel instanceof TextChannel) {
//                 await msg.channel.send({
//                     files: ["./assets/images/garolfa-profile.jpg"],
//                 });
//             } else {
//                 await msg.reply("This command can only be used in a text channel.");
//             }
//         }

//         if (available_bot && msg.content === C_.ALBER.name) {
//             // Check if the channel is a TextChannel
//             if (msg.channel instanceof TextChannel) {
//                 await msg.channel.send(
//                     `han pasado ${Math.floor(Math.random() * 100)} días desde el ultimo bife`
//                 );

//                 const alberImg = [
//                     "https://media.tiempodesanjuan.com/p/48241a6e591cec56477be174421c777c/adjuntos/331/imagenes/000/762/0000762150/790x0/smart/albertojpg.jpg",
//                     "https://pbs.twimg.com/media/GUf-N3QXcAAfXJQ.jpg",
//                     "https://www.clarin.com/img/2022/06/21/tLnSIH08I_720x0__1.jpg",
//                     "https://media.lmcipolletti.com/p/be340a12bcd48535d5779ca8eb55d651/adjuntos/195/imagenes/007/483/0007483103/albertojpg.jpg",
//                     "https://www.argentina.gob.ar/sites/default/files/alberto_fernandez_presidente_argentino_brinda_datos_con_graficos_sobre_coronavirus_0.jpg",
//                 ];

//                 await msg.channel.send({
//                     files: [alberImg[Math.floor(Math.random() * alberImg.length)]],
//                 });
//             } else {
//                 await msg.reply("Este comando solo se puede usar en un canal de texto.");
//             }
//         }

//         if (available_bot && msg.content === C_.CAT.name) {
//             // Check if the channel is a TextChannel
//             if (msg.channel instanceof TextChannel) {
//                 sendRandomImg("cat", msg.channel);
//             } else {
//                 msg.reply("This command can only be used in a text channel.");
//             }
//         }
//         if (available_bot && msg.content === C_.LAS_QUIERO.name) {
//             try {
//                 await playSongBis("lasquiero");
//                 voiceFun(msg);
//             } catch (error) {
//                 console.error(error);
//             }
//         }

//         if (available_bot && msg.content === C_.STATS.name) {
//             // db.data.pain[msg.author.username] &&
//             // msg.reply(String(db.data.pain[msg.author.username]));
//         }

//         if (available_bot && msg.content === C_.PAIN.name) {
//             // db.data.pain[msg.author.username]
//             //   ? (db.data.pain[msg.author.username] =
//             //       db.data.pain[msg.author.username] + 1)
//             //   : (db.data.pain[msg.author.username] = 1);
//             try {
//                 await playRandom("age");
//                 voiceFun(msg);
//             } catch (error) {
//                 console.error(error);
//             }
//             // db.write();
//         }

//         if (
//             available_bot &&
//             msg.content === C_.INCONDICIONAL.name &&
//             C_.INCONDICIONAL.permission?.find((g) => g.id === msg.guildId)
//         ) {
//             const dateA = new Date();
//             try {
//                 await playSongBis("giraldo+de+ayer-001");
//                 const dateB = new Date();
//                 console.log(
//                     "milis =>",
//                     dateB.getTime() - dateA.getTime(),
//                     "giraldo+de+ayer-001"
//                 );
//                 console.log("Song is ready to play!");

//                 voiceFun(msg);
//             } catch (error) {
//                 console.error(error);
//             }
//         }

//         if (
//             available_bot &&
//             msg.content === C_.DIENTES.name &&
//             C_.DIENTES.permission?.find((g) => g.id === msg.guildId)
//         ) {
//             try {
//                 await playSongBis("dientes");
//                 voiceFun(msg);
//             } catch (error) {
//                 console.error(error);
//             }
//         }

//         if (
//             available_bot &&
//             msg.content === C_.BUD.name &&
//             C_.BUD.permission?.find((g) => g.id === msg.guildId)
//         ) {
//             try {
//                 console.log("BUDDD");
//                 await playSongBis("BUDWAIZA");
//                 voiceFun(msg);
//             } catch (error) {
//                 console.error(error);
//             }
//         }

//         if (
//             available_bot &&
//             msg.content === C_.MUNDO.name &&
//             C_.MUNDO.permission?.find((g) => g.id === msg.guildId)
//         ) {
//             try {
//                 await playSongBis("giraldoypabloc");
//                 voiceFun(msg);
//             } catch (error) {
//                 console.error(error);
//             }
//         }

//         // if (
//         //     available_bot &&
//         //     msg.content === C_.DREVI.name &&
//         //     C_.DREVI.permission?.find((g) => g.id === msg.guildId)
//         // ) {
//         //     try {
//         //         await playSongBis("drevi");
//         //         voiceFun(msg);
//         //     } catch (error) {
//         //         console.error(error);
//         //     }
//         // }

//         // if (
//         //     available_bot &&
//         //     msg.content === C_.MAVE.name &&
//         //     C_.MAVE.permission?.find((g) => g.id === msg.guildId)
//         // ) {
//         //     try {
//         //         await playSongBis("mave");
//         //         voiceFun(msg);
//         //     } catch (error) {
//         //         console.error(error);
//         //     }
//         // }

//         // if (
//         //     available_bot &&
//         //     msg.content === C_.EZEQ.name &&
//         //     C_.EZEQ.permission?.find((g) => g.id === msg.guildId)
//         // ) {
//         //     try {
//         //         await playSongBis("ezequiel");
//         //         voiceFun(msg);
//         //     } catch (error) {
//         //         console.error(error);
//         //     }
//         // }

//         // if (
//         //     available_bot &&
//         //     msg.content === C_.PABLOC.name &&
//         //     C_.PABLOC.permission?.find((g) => g.id === msg.guildId)
//         // ) {
//         //     try {
//         //         await playSongBis("pablo");
//         //         voiceFun(msg);
//         //     } catch (error) {
//         //         console.error(error);
//         //     }
//         // }

//         // if (
//         //     available_bot &&
//         //     msg.content === C_.ANDY.name &&
//         //     C_.ANDY.permission?.find((g) => g.id === msg.guildId)
//         // ) {
//         //     try {
//         //         await playSongBis("andy");
//         //         voiceFun(msg);
//         //     } catch (error) {
//         //         console.error(error);
//         //     }
//         // }
//     });
// })();

// client.on("ready", async () => {
//     console.log("Discord.js client is ready!");
// });


// index.ts
import { join, dirname } from "path";
// import { Low, JSONFile } from "lowdb"; // Uncomment if using lowdb
import { fileURLToPath } from "url";
import { scrapper } from "./utils/scrapper.js"; // Import your scrapper utility
import { TextChannel, Client, GatewayIntentBits, Message } from "discord.js";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    playSongBis,
    stop,
    pause,
    resume,
    playRandom,
} from "./voice.ts";

import { sendRandomImg } from "./utils.ts";
import {
    C_,
    U_,
    findUser,
    isBytes,
    isTestGuild,
    isWanna,
    LEOG,
    GD92,
    MAVE,
    DREVI,
    TINCHO,
    EZEQ,
    PABLOC,
    ANDY,
} from "./data.ts"; // Adjust based on your actual structure

const client: Client<boolean> = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Use await in an async function
(async () => {
    await client.login(process.env.BOT_TOKEN as string);
    client.user?.setActivity("commands >> 'aiuda'");

    let available_bot = true;

    client.on("voiceStateUpdate", async (oldMember, newMember) => {
        console.log("oldMember", oldMember.member?.user.username);

        // Check if the old member is leaving the voice channel
        if (oldMember.channelId && !newMember.channelId) {
            console.log(`${oldMember.member?.user.username} has left the voice channel.`);
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
                await playSongBis("knock1", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
            }
            return;
        }
        if (available_bot && msg.content === C_.PUERTA.name) {
            try {
                await playSongBis("knock2", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
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

        if (available_bot && msg.content === C_.LAS_QUIERO.name) {
            try {
                await playSongBis("lasquiero", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        if (available_bot && msg.content === C_.PAIN.name) {
            try {
                await playRandom("age", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        if (available_bot && msg.content === C_.INCONDICIONAL.name
            // && C_.INCONDICIONAL.permission?.find((g) => g.id === msg.guildId)

        ) {
            try {
                await playSongBis("giraldo+de+ayer-001", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        if (available_bot && msg.content === C_.DIENTES.name && C_.DIENTES.permission?.find((g) => g.id === msg.guildId)) {
            try {
                await playSongBis("dientes", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        if (available_bot && msg.content === C_.BUD.name && C_.BUD.permission?.find((g) => g.id === msg.guildId)) {
            try {
                await playSongBis("BUDWAIZA", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        if (available_bot && msg.content === C_.MUNDO.name && C_.MUNDO.permission?.find((g) => g.id === msg.guildId)) {
            try {
                await playSongBis("giraldoypabloc", msg);
                voiceFun(msg);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        // Uncomment and add any additional command handling as needed
        /*
        if (available_bot && msg.content === C_.DREVI.name && C_.DREVI.permission?.find((g) => g.id === msg.guildId)) {
            // Your logic for DREVI command
        }
        if (available_bot && msg.content === C_.MAVE.name && C_.MAVE.permission?.find((g) => g.id === msg.guildId)) {
            // Your logic for MAVE command
        }
        // Continue for other commands...
        */
    });
})();

client.on("ready", async () => {
    console.log("Discord.js client is ready!");
});
