require("dotenv").config();

const {
  voiceFun,
  playSong,
  playSongBis,
  playSongAge,
  stop,
  pause,
  resume,
} = require("./voice");
const {
  findUser,
  isBytes,
  isTestGuild,
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

const testFolder = "././assets/images/meme/cat/";
const fs = require("fs");
const { time } = require("console");
const cat = fs.readdirSync(testFolder);

client.on("message", (msg) => {
  if (msg.content === "cat") {
    msg.channel.send({
      files: [
        `./assets/images/meme/cat/${
          cat[Math.floor(Math.random() * cat.length)]
        }`,
      ],
    });
  }
});

// client.on("message", async (message) => {
//   // if (message.content === "qweasdzxc") {
//   if (message.content === "incondicional") {
//     voiceFun(message);
//   }
// });

client.on("ready", async () => {
  console.log("Discord.js client is ready!");
  // const dateA = new Date();

  // try {
  //   await playSong();
  //   const dateB = new Date();
  //   console.log("milis =>", dateB.getTime() - dateA.getTime());
  //   console.log("Song is ready to play!");
  // } catch (error) {
  //   console.error(error);
  // }
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
  if (message.content === "knock") {
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
  if (message.content === "puerta") {
    try {
      await playSongBis("knock2");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (message.content === "las quiero") {
    try {
      await playSongBis("lasquiero");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (message.content === "pain") {
    try {
      await playSongAge("lasquiero");
      voiceFun(message);
    } catch (error) {
      console.error(error);
    }
  }
});

client.on("message", async (message) => {
  if (message.content === "incondicional" && isBytes(message.channelId)) {
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
