require("dotenv").config();

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

client.on("messageDelete", (msg) => {
  msg.channel.send("Qué borra gato");

  msg.channel.send(`${msg.author.username} said ${msg.content}`);
});

client.on("message", (msg) => {
  //drevi
  if (msg.author.id === "233728781167230996") {
    // msg.reply(`quien so? `);
    msg.react("🤢");
  }
  if (msg.author.id === "158794899083231232") {
    //   msg.reply(`^_^ ${msg.author.username} `);
    msg.react("❤️");
  }

  //martin
  if (msg.author.id === "158805057775599625") {
    msg.react("🤭");
  }
  //ezeq
  if (msg.author.id === "158793676116590593") {
    msg.react("👻");
  }
});
