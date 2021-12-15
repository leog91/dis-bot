export const LEOG = "leog";
export const DREVI = "drevi";
export const TINCHO = "tincho";
export const EZEQ = "ezeq";
export const GD92 = "GD92";
export const MAVE = "MAVE";
export const PABLOC = "PABLOC";
export const ANDY = "ANDY";

const CONSTANTS = {};

const AUDIO = "AUDIO";
const TEXT = "TEXT";

const guilds = [
  { name: "Wanna", id: "233725944911626240" },
  { name: "Bytes", id: "185183293552066560" },
  { name: "plll", id: "243582757815451649" },
];

const users = [
  {
    username: LEOG,
    id: "158794899083231232",
  },
  {
    username: GD92,
    id: "220352903578124288",
  },
  {
    username: MAVE,
    id: "311259706133839873",
  },
  {
    username: PABLOC,
    id: "323306470022053898",
  },
  {
    username: ANDY,
    id: "236909116474261505",
  },

  {
    username: DREVI,
    id: "233728781167230996",
  },
  {
    username: TINCHO,
    id: "158805057775599625",
  },
  {
    username: EZEQ,
    id: "158793676116590593",
  },
];

//users
const U_ = {
  LEOG: { id: "sarasa", nick: "leog" },
  GAROLFA: { id: "idSarasa", nick: "garolfa" },
};

//commands
const C_ = {
  PAIN: { name: "pain", type: AUDIO, description: "" },
  PIC: { name: "pic", type: TEXT, description: "" },
};

const emoji = ["👻", "🤭", "🍆", "🌭", "☕", "❤️", "🤢"];

//TO-DO
const pickEmoji = () => {};

export const isBytes = (c_id) =>
  guilds.find((g) => g.name === "Bytes").id === c_id;
export const isWanna = (c_id) =>
  guilds.find((g) => g.name === "Wanna").id === c_id;

export const isTestGuild = (c_id) =>
  guilds.find((g) => g.name === "plll").id === c_id;

export const findUser = (userName) =>
  users.find((u) => u.username === userName);
