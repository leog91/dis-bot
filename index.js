import { join, dirname } from "path";
import { Low, JSONFile } from "lowdb";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use JSON file for storage
const file = join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Read data from JSON file, this will set db.data content
await db.read();

// If file.json doesn't exist, db.data will be null
// Set default data
// db.data = db.data || { posts: [] } // Node < v15.x
db.data ||= { posts: [] }; // Node >= 15.x

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

import Discord from "discord.js";

const client = new Discord.Client({
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"],
});

client.login(process.env.BOT_TOKEN);

let available_bot = true;

let voice_enable = true;
//text command, voice command

//available bot check

client.on("message", async (msg) => {
  if (msg.content === "stop") {
    stop();
  }
  if (msg.content === "pause") {
    pause();
  }
  if (msg.content === "resume") {
    resume();
  }
  if (msg.content === "_status") {
    if (msg.author.id === findUser(LEOG).id) {
      msg.reply(available_bot ? "on" : "off");
      msg.react("✅");
    } else {
      msg.react("❌");
    }
    return;
  }
  if (msg.content === "_on" && msg.author.id === findUser(LEOG).id) {
    available_bot = true;
    msg.reply("on");
  }
  if (msg.content === "_off" && msg.author.id === findUser(LEOG).id) {
    available_bot = false;
    msg.reply("off");
  }
  if (available_bot && msg.content.includes("bot")) {
    msg.reply("BUEN DIA GRUPO");
  }

  if (available_bot && msg.content === "knock") {
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
  if (available_bot && msg.content === "puerta") {
    console.log("puertaaa");
    try {
      await playSongBis("knock2");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (available_bot && msg.content === "pic") {
    msg.channel.send({
      files: ["./assets/images/garolfa-profile.jpg"],
    });
  }

  if (available_bot && msg.content === "cat") {
    sendRandomImg("cat", msg.channel);
  }

  if (available_bot && msg.content === "las quiero") {
    try {
      await playSongBis("lasquiero");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (available_bot && msg.content === "stats") {
    db.data.pain[msg.author.username] &&
      msg.reply(String(db.data.pain[msg.author.username]));
  }

  if (available_bot && msg.content === "pain") {
    db.data.pain[msg.author.username]
      ? (db.data.pain[msg.author.username] =
          db.data.pain[msg.author.username] + 1)
      : (db.data.pain[msg.author.username] = 1);

    try {
      await playRandom("age");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
    db.write();
  }

  if (
    available_bot &&
    msg.content === "incondicional" &&
    isBytes(msg.guildId)
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

  if (available_bot && msg.content === "dientes" && isBytes(msg.guildId)) {
    try {
      await playSongBis("dientes");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (available_bot && msg.content === "BUD" && isBytes(msg.guildId)) {
    try {
      await playSongBis("BUDWAIZA");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (available_bot && msg.content === "mundo" && isBytes(msg.guildId)) {
    try {
      await playSongBis("giraldoypabloc");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (available_bot && msg.content === "age123" && isBytes(msg.guildId)) {
    try {
      await playSongBis("jajajajaja34 age");
      voiceFun(msg);
    } catch (error) {
      console.error(error);
    }
  }

  if (available_bot && msg.content === "peti" && isWanna(msg.guildId)) {
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

  if (available_bot && msg.author.id === findUser(LEOG).id) {
    msg.react("❤️");
    return;
  }

  if (available_bot && msg.author.id === findUser(GD92).id) {
    msg.react("☕");
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
