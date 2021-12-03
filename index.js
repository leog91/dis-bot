require("dotenv").config();

const { voiceFun, playSong } = require("./voice");
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

const client = new Discord.Client({
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"],
});

client.login(process.env.BOT_TOKEN);

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
    return;
  }

  if (msg.author.id === findUser(GD92).id) {
    msg.react("☕");
    return;
  }
  if (msg.author.id === findUser(MAVE).id) {
    msg.react("🌭");
    return;
  }
  if (msg.author.id === findUser(PABLOC).id) {
    msg.react("🍆");
    return;
  }
  if (msg.author.id === findUser(ANDY).id) {
    msg.react("🦖");
    return;
  }

  if (msg.author.id === findUser(TINCHO).id) {
    msg.react("🤭");
    return;
  }

  if (msg.author.id === findUser(EZEQ).id) {
    msg.react("👻");
    return;
  }

  msg.react("🦖");
});

//remoteIMG
client.on("message", (msg) => {
  if (msg.content === "123qwe") {
    msg.react("🤢");
    msg.channel
      .send({
        files: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Pac_Man.svg/1200px-Pac_Man.svg.png",
        ],
      })
      .catch(console.error);
  }
});

//localfile
client.on("message", (msg) => {
  if (msg.content === "pic") {
    // msg.react("🤢");
    msg.channel.send({
      files: ["./assets/images/garolfa-profile.jpg"],
    });
  }
});

client.on("message", async (message) => {
  if (message.content === "qweasdzxc") {
    voiceFun(message);
  }
});

client.on("ready", async () => {
  console.log("Discord.js client is ready!");

  try {
    await playSong();
    console.log("Song is ready to play!");
  } catch (error) {
    console.error(error);
  }
});
