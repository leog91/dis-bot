import fs from "fs";

export const sendRandomImg = (command, channel) => {
  const assets = fs.readdirSync(folderPaths[command]);
  channel.send({
    files: [
      folderPaths[command] + assets[Math.floor(Math.random() * assets.length)],
    ],
  });
};

export const randomAsset = (command) => {
  const assets = fs.readdirSync(folderPaths[command]);
  return (
    folderPaths[command] + assets[Math.floor(Math.random() * assets.length)]
  );
};

const folderPaths = {
  cat: "./assets/images/meme/cat/",
  age: "./assets/audio/age/",
};
