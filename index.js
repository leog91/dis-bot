require("dotenv").config();

const {
  findUser,
  LEOG,
  GD92,
  MAVE,
  DREVI,
  TINCHO,
  EZEQ,
  PABLOC,
  ANDY,
} = require("./data");

const Discord = require("discord.js");
// const client = new Discord.Client();
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });

client.login(process.env.BOT_TOKEN);
client.on("ready", () => {
  console.log("The bot is ready");
});
client.on("message", (msg) => {
  if (msg.content.includes("bot")) {
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

client.on("message", (msg) => {
  if (msg.author.id === findUser(DREVI).id) {
    // msg.reply(`quien so? `);
    msg.react("🤢");
  }

  if (msg.author.id === findUser(LEOG).id) {
    //   msg.reply(`^_^ ${msg.author.username} `);
    msg.react("❤️");
  }

  if (msg.author.id === findUser(GD92).id) {
    msg.react("☕");
  }
  if (msg.author.id === findUser(MAVE).id) {
    msg.react("🌭");
  }
  if (msg.author.id === findUser(PABLOC).id) {
    msg.react("🍆");
  }
  if (msg.author.id === findUser(ANDY).id) {
    msg.react("🦖");
  }

  if (msg.author.id === findUser(TINCHO).id) {
    msg.react("🤭");
  }

  if (msg.author.id === findUser(EZEQ).id) {
    msg.react("👻");
  }
});
