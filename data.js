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

const G_ = {
  Wanna: { id: "233725944911626240" },
  Bytes: { id: "185183293552066560" },
  Test: { id: "243582757815451649" },
};

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
export const U_ = {
  LEOG: { id: "158794899083231232", nick: "leog" },
  GAROLFA: { id: "idSarasa", nick: "garolfa" },
};

//commands
//test permission
export const C_ = {
  PAIN: { name: "pain", type: AUDIO, description: "" },
  PIC: { name: "pic", type: TEXT, description: "" },
  BUD: { name: "bud", type: AUDIO, description: "", permission: [G_.Bytes] },
  CAT: { name: "cat", type: TEXT, description: "" },
  LAS_QUIERO: { name: "las quiero", type: AUDIO, description: "" },
  STATS: { name: "stats", type: TEXT, description: "" },
  STOP: { name: "stop", type: AUDIO, description: "" },
  PAUSE: { name: "pause", type: AUDIO, description: "" },
  RESUME: { name: "resume", type: AUDIO, description: "" },
  STATUS: {
    name: "_status",
    type: TEXT,
    description: "",
    permission: [U_.LEOG],
  },
  ON: {
    name: "_on",
    type: TEXT,
    description: "",
    permission: [U_.LEOG],
  },
  OFF: {
    name: "_off",
    type: TEXT,
    description: "",
    permission: [U_.LEOG],
  },
  BOT: { name: "bot", type: TEXT, description: "" },
  KNOCK: { name: "knock", type: AUDIO, description: "" },
  PUERTA: { name: "puerta", type: AUDIO, description: "" },
  INCONDICIONAL: {
    name: "incondicional",
    type: AUDIO,
    description: "",
    permission: [G_.Bytes],
  },
  PETI: {
    name: "peti",
    type: AUDIO,
    description: "",
    permission: [G_.Wanna, G_.Test],
  },
  MUNDO: {
    name: "mundo",
    type: AUDIO,
    description: "",
    permission: [G_.Bytes],
  },
  DIENTES: {
    name: "dientes",
    type: AUDIO,
    description: "",
    permission: [G_.Bytes],
  },

  AGE123: {
    name: "age123",
    type: AUDIO,
    description: "",
    permission: [G_.Bytes],
  },
  AIUDA: {
    name: "aiuda",
    type: TEXT,
    description: "",
  },
};

// console.log(Object.keys(C_));

// console.log(Object.keys(C_).map((k) => C_[k].name));

/*
const commands = Object.entries(Object.entries(C_).map((c) => c[1]))
  .map((q) => q[1])
  .filter((x) => x.permission === undefined)
  .map((c) => c.name);

console.log("comandss =>", [
  ...commands,
  ...Object.entries(Object.entries(C_).map((c) => c[1]))
    .map((q) => q[1])
    .filter(
      // (x) => x.permission && x.permission.find((g) => g.id === msg.guildId)
      (x) => x.permission && x.permission.find((g) => g.id === G_.Wanna.id)
    )
    .map((c) => c.name),
]);
*/

/*  
console.log(
  
  Object.entries(Object.entries(C_).map((c) => c[1]))
    .map((q) => q[1])
    .filter((x) => x.permission === undefined)
    .map((c) => c.name)
);

console.log(
  Object.entries(Object.entries(C_).map((c) => c[1]))
    .map((q) => q[1])
    .filter(
      // (x) => x.permission && x.permission.find((g) => g.id === msg.guildId)
      (x) => x.permission && x.permission.find((g) => g.id === G_.Wanna.id)
    )
    .map((c) => c.name)
);

console.log(Object.entries(C_).filter((c) => c.name === "age123"));

*/

// Object.keys

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
