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

client.on("message", (msg) => {
  if (msg.content === "_off" && msg.author.id === findUser(LEOG).id) {
    available_bot = false;
    msg.reply("off");
  }
});

client.on("message", (msg) => {
  if (msg.content === "_on" && msg.author.id === findUser(LEOG).id) {
    available_bot = true;
    msg.reply("on");
  }
});

client.on("message", (msg) => {
  if (msg.content === "_status" && msg.author.id === findUser(LEOG).id) {
    msg.reply(available_bot ? "on" : "off");
  }
});

//unify clients on event

client.on("message", (msg) => {
  if (available_bot && msg.content.includes("bot")) {
    // msg.react("❤️");
    // msg.react("🤢");
    // msg.react("🤭");
    // msg.react("👻");

    msg.reply("BUEN DIA GRUPO");
  }
});
//

//

client.on("messageDelete", (msg) => {
  msg.channel.send("Qué borra gato");

  msg.channel.send(`${msg.author.username} said ${msg.content}`);
});

//reactions
client.on("message", (msg) => {
  if (available_bot && msg.author.id === findUser(DREVI).id) {
    // msg.reply(`quien so? `);
    msg.react("🤢");
    return;
  }

  if (available_bot && msg.author.id === findUser(LEOG).id) {
    //   msg.reply(`^_^ ${msg.author.username} `);
    msg.react("❤️");
    // msg.react(":smile:");

    //custom emoji
    // const reactionEmoji = msg.guild.emojis.cache.find(
    //   (emoji) => emoji.name === "dank"
    // );
    // msg.react(reactionEmoji);

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

//localfile
client.on("message", (msg) => {
  if (available_bot && msg.content === "pic") {
    // msg.react("🤢");
    msg.channel.send({
      files: ["./assets/images/garolfa-profile.jpg"],
    });
  }
});

client.on("message", (msg) => {
  if (available_bot && msg.content === "cat") {
    sendRandomImg("cat", msg.channel);
  }
});

client.on("ready", async () => {
  console.log("Discord.js client is ready!");
});

client.on("message", (message) => {
  if (message.content === "stop") {
    stop();
  }
});

client.on("message", (message) => {
  if (message.content === "pause") {
    pause();
  }
});
client.on("message", (message) => {
  if (message.content === "resume") {
    resume();
  }
});

client.on("message", async (message) => {
  if (available_bot && message.content === "knock") {
    const dateA = new Date();
    try {
      await playSongBis("knock1");
      const dateB = new Date();
      console.log("milis =>", dateB.getTime() - dateA.getTime(), "knock1");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (available_bot && message.content === "puerta") {
    try {
      await playSongBis("knock2");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (available_bot && message.content === "las quiero") {
    try {
      await playSongBis("lasquiero");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (available_bot && message.content === "stats") {
    db.data.pain[message.author.username] &&
      message.reply(String(db.data.pain[message.author.username]));
  }
});

client.on("message", async (message) => {
  if (available_bot && message.content === "pain") {
    db.data.pain[message.author.username]
      ? (db.data.pain[message.author.username] =
          db.data.pain[message.author.username] + 1)
      : (db.data.pain[message.author.username] = 1);

    // await db.read();
    // db.data.pain = db.data.pain + 1;

    try {
      await playRandom("age");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
    db.write();
  }
});

client.on("message", async (message) => {
  if (
    available_bot &&
    message.content === "incondicional" &&
    isBytes(message.guildId)
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

      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (
    available_bot &&
    message.content === "dientes" &&
    isBytes(message.guildId)
  ) {
    try {
      await playSongBis("dientes");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (available_bot && message.content === "BUD" && isBytes(message.guildId)) {
    try {
      await playSongBis("BUDWAIZA");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (
    available_bot &&
    message.content === "mundo" &&
    isBytes(message.guildId)
  ) {
    try {
      await playSongBis("giraldoypabloc");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (
    available_bot &&
    message.content === "age123" &&
    isBytes(message.guildId)
  ) {
    try {
      await playSongBis("jajajajaja34 age");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (available_bot && message.content === "peti" && isWanna(message.guildId)) {
    try {
      await playSongBis("petifica3");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});
