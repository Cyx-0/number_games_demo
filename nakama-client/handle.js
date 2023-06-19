require("./polyfill.js");
const pkg = require("@heroiclabs/nakama-js");
const client = new pkg.Client("defaultkey", "127.0.0.1", 7350);
client.ssl = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createdSocket(session) {
  const socket = client.createSocket();
  var appearOnline = true;
  await socket.connect(session, appearOnline);
  return socket;
}

async function authenticate(id, name) {
  try {
    const customId = `some-custom-id${id}`;
    const create = true;
    const session = await client.authenticateCustom(customId, create, name);
    return session;
  } catch (error) {
    console.log("authenticate", error);
  }
}

async function createThreeUsersSession() {
  let session_list = [];
  for (let i = 0; i < 3; i++) {
    const session = await authenticate(`id${i}`, `user${i}`);
    session_list.push(session);
  }
  session_list = await Promise.all(session_list);
  return session_list;
}

async function createThreeSocket(session_list) {
  let socket_list = session_list.map(async (item) => {
    const socket = await createdSocket(item);
    return socket;
  });
  socket_list = await Promise.all(socket_list);
  return socket_list;
}

module.exports = { client, sleep, createThreeUsersSession, createThreeSocket };
