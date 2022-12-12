import { join, dirname } from "path";
// import { Low, JSONFile } from "lowdb";
import { fileURLToPath } from "url";
import { scrapper } from "./utils/scrapper.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// const sneaker = (data) =>
//   `product:${data.freeProduct[0].productName} + code:${data.code} + page:${data.page} url:${data.url}`;

const sneaker = (data) =>
  `product:${data.fullProduct.productName} \n code:${data.code}  \n url >>> ${data.url}`;
// + page:${data.page}

// Use JSON file for storage
// const file = join(__dirname, "db.json");
// const adapter = new JSONFile(file);
// const db = new Low(adapter);

// Read data from JSON file, this will set db.data content
// await db.read();

// If file.json doesn't exist, db.data will be null
// Set default data
// db.data = db.data || { posts: [] } // Node < v15.x
// db.data ||= { posts: [] }; // Node >= 15.x

import dotenv from "dotenv";
dotenv.config();

import {
  voiceFun,
  playSong,
  playSongBis,
  stop,
  pause,
  resume,
  playRandom,
} from "./voice.js";

import { sendRandomImg } from "./utils.js";
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
} from "./data.js";

import Discord, { GatewayIntentBits } from "discord.js";

const client = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    //   "GUILDS",
    //   "GUILD_MESSAGES",
    //   "GUILD_VOICE_STATES",
    // "MESSAGE_CONTENT",
  ],
});

await client.login(process.env.BOT_TOKEN);

client.user.setActivity("commands >> 'aiuda'");

let available_bot = true;

let voice_enable = true;
//text command, voice command

//available bot check

// C_[`${msg.content}`]

// C_[msg.content] ;
// true && C_[msg.content]

// permission ( C_[`content`].permission.find((g) => g.id === msg.guildId) )

//if is command, db.save (command, valid?,times)
//db.save .. sv_Id,

// client.guilds.cache.size

client.on("messageCreate", async (msg) => {
  if (msg.content === C_.STOP.name) {
    stop();
  }
  if (msg.content === C_.PAUSE.name) {
    pause();
  }
  if (msg.content === C_.RESUME.name) {
    resume();
  }
  if (msg.content === C_.STATUS.name) {
    if (C_.STATUS.permission.find((u) => u.id === msg.author.id)) {
      msg.reply(available_bot ? "on" : "off");
      msg.react("✅");
    } else {
      msg.react("❌");
    }
    return;
  }
  if (
    msg.content === C_.ON.name &&
    C_.STATUS.permission.find((u) => u.id === msg.author.id)
  ) {
    available_bot = true;
    msg.reply("on");
  }
  if (
    msg.content === C_.OFF.name &&
    C_.STATUS.permission.find((u) => u.id === msg.author.id)
  ) {
    available_bot = false;
    msg.reply("off");
  }
  if (available_bot && msg.content.includes(C_.BOT.name) && !msg.author.bot) {
    msg.reply("BUEN DIA GRUPO");
  }

  if (available_bot && msg.content === C_.AIUDA.name) {
    // msg.reply("work in progress");

    let commands = Object.entries(Object.entries(C_).map((c) => c[1]))
      .map((q) => q[1])
      .filter((x) => x.permission === undefined)
      .map((c) => c.name);

    commands = [
      ...commands,
      ...Object.entries(Object.entries(C_).map((c) => c[1]))
        .map((q) => q[1])
        .filter(
          (x) => x.permission && x.permission.find((g) => g.id === msg.guildId)
        )
        .map((c) => c.name),
    ].toString();

    // console.log("===>", commands.split(","));

    msg.reply(commands);
  }

  if (available_bot && msg.content === C_.KNOCK.name) {
    const dateA = new Date();
    try {
      await playSongBis("knock1");
      const dateB = new Date();
      console.log("milis =>", dateB.getTime() - dateA.getTime(), "knock1");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }
  if (available_bot && msg.content === C_.PUERTA.name) {
    console.log("puertaaa");
    try {
      await playSongBis("knock2");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (available_bot && msg.content === C_.PIC.name) {
    msg.channel.send({
      files: ["./assets/images/garolfa-profile.jpg"],
    });
  }

  if (available_bot && msg.content === C_.CAT.name) {
    sendRandomImg("cat", msg.channel);
  }

  if (available_bot && msg.content === C_.LAS_QUIERO.name) {
    try {
      await playSongBis("lasquiero");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (available_bot && msg.content === C_.STATS.name) {
    // db.data.pain[msg.author.username] &&
    // msg.reply(String(db.data.pain[msg.author.username]));
  }

  if (available_bot && msg.content === C_.PAIN.name) {
    // db.data.pain[msg.author.username]
    //   ? (db.data.pain[msg.author.username] =
    //       db.data.pain[msg.author.username] + 1)
    //   : (db.data.pain[msg.author.username] = 1);
    try {
      await playRandom("age");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
    // db.write();
  }

  if (
    available_bot &&
    msg.content === C_.INCONDICIONAL.name &&
    C_.INCONDICIONAL.permission.find((g) => g.id === msg.guildId)
  ) {
    const dateA = new Date();
    try {
      await playSongBis("giraldo+de+ayer-001");
      const dateB = new Date();
      console.log(
        "milis =>",
        dateB.getTime() - dateA.getTime(),
        "giraldo+de+ayer-001"
      );
      console.log("Song is ready to play!");

      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (
    available_bot &&
    msg.content === C_.DIENTES.name &&
    C_.DIENTES.permission.find((g) => g.id === msg.guildId)
  ) {
    try {
      await playSongBis("dientes");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (
    available_bot &&
    msg.content === C_.BUD.name &&
    C_.BUD.permission.find((g) => g.id === msg.guildId)
  ) {
    try {
      console.log("BUDDD");
      await playSongBis("BUDWAIZA");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (
    available_bot &&
    msg.content === C_.MUNDO.name &&
    C_.MUNDO.permission.find((g) => g.id === msg.guildId)
  ) {
    try {
      await playSongBis("giraldoypabloc");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (
    available_bot &&
    msg.content === C_.AGE123.name &&
    C_.AGE123.permission.find((g) => g.id === msg.guildId)
  ) {
    try {
      await playSongBis("jajajajaja34 age");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (
    available_bot &&
    msg.content === C_.PETI.name &&
    C_.PETI.permission.find((g) => g.id === msg.guildId)
  ) {
    try {
      await playSongBis("petifica3");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }
  //reaction

  if (available_bot && msg.author.id === findUser(DREVI).id) {
    msg.react("🤢");
    return;
  }

  if (
    available_bot &&
    msg.author.id === findUser(LEOG).id &&
    msg.content === "scan1"
  ) {
    msg.react("🍆");

    const data = await scrapper();

    msg.author.send("scaned :" + data.scaned.toString());
    data.products.forEach((d) => msg.author.send(sneaker(d)));

    return;
  }

  if (available_bot && msg.author.id === findUser(LEOG).id) {
    msg.react("❤️");

    // const data = await scrapper();

    // msg.author.send("scaned :" + data.scaned.toString());
    // data.products.forEach((d) => msg.author.send(sneaker(d)));

    console.log("msg.content", msg);

    return;
  }

  if (available_bot && msg.author.id === findUser(GD92).id) {
    msg.react("☕");
    // const data = await scrapper();

    // msg.author.send("scaned :" + data.scaned.toString());
    // data.products.forEach((d) => msg.author.send(sneaker(d)));

    return;
  }
  if (available_bot && msg.author.id === findUser(MAVE).id) {
    msg.react("🌭");
    return;
  }
  if (available_bot && msg.author.id === findUser(PABLOC).id) {
    msg.react("🍆");
    return;
  }
  if (available_bot && msg.author.id === findUser(ANDY).id) {
    msg.react("🦖");
    return;
  }

  if (available_bot && msg.author.id === findUser(TINCHO).id) {
    msg.react("🤭");
    return;
  }

  if (available_bot && msg.author.id === findUser(EZEQ).id) {
    msg.react("👻");
    return;
  }

  available_bot && msg.react("🦖");
});

client.on("messageDelete", (msg) => {
  msg.channel.send("Qué borra gato");

  msg.channel.send(`${msg.author.username} said ${msg.content}`);
});

client.on("ready", async () => {
  console.log("Discord.js client is ready!");
});
