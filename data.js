const LEOG = "leog";
const DREVI = "drevi";
const TINCHO = "tincho";
const EZEQ = "ezeq";

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

const findUser = (userName) => users.find((u) => u.username === userName);

module.exports = {
  users,
  findUser,
  LEOG,
  DREVI,
  TINCHO,
  EZEQ,
};
