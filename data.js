const LEOG = "leog";
const DREVI = "drevi";
const TINCHO = "tincho";
const EZEQ = "ezeq";
const GD92 = "GD92";
const MAVE = "MAVE";
const PABLOC = "PABLOC";
const ANDY = "ANDY";

const guilds = [
  { name: "Wanna", id: "233725944911626240" },

  { name: "Bytes", id: "185183293552066560" },
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

const emoji = ["👻", "🤭", "🍆", "🌭", "☕", "❤️", "🤢"];

const findUser = (userName) => users.find((u) => u.username === userName);

module.exports = {
  users,
  findUser,
  LEOG,
  GD92,
  MAVE,
  PABLOC,
  ANDY,
  DREVI,
  TINCHO,
  EZEQ,
};
