const {
  client,
  sleep,
  createThreeUsersSession,
  createThreeSocket,
} = require("./handle");

async function init() {
  const session_list = await createThreeUsersSession();
  const socket_list = await createThreeSocket(session_list);
  // 创建比赛
  const payload = { fast: true };
  const response = await client.rpc(session_list[0], "find_match_js", payload);
  const matchIds = response.payload.matchIds;
  var id = matchIds[0];

  await sleep(2000);
  // 加入比赛
  await socket_list[0].joinMatch(id);
  await sleep(2000);
  socket_list[0].onmatchdata = (matchState) => {
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(matchState.data);
    // console.log(jsonString);
    const message = JSON.parse(jsonString);
    console.log(message);
  };

  await sleep(2000);
  // 加入比赛
  await socket_list[1].joinMatch(id);
  await sleep(2000);
  socket_list[1].onmatchdata = (matchState) => {
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(matchState.data);
    // console.log(jsonString);
    const message = JSON.parse(jsonString);
    console.log(message);
  };

  await sleep(2000);
  // 加入比赛
  await socket_list[2].joinMatch(id);
  await sleep(2000);
  socket_list[2].onmatchdata = (matchState) => {
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(matchState.data);
    // console.log(jsonString);
    const message = JSON.parse(jsonString);
    console.log(message);
  };
  return [socket_list, matchIds];
}

async function main() {
  const socket_list_and_matchIds = await init();
  const socket_list = socket_list_and_matchIds[0];
  const matchIds = socket_list_and_matchIds[1];

  await sleep(3000);
  await socket_list[0].sendMatchState(
    matchIds[0],
    2,
    JSON.stringify({
      question: "11",
    })
  );
  await sleep(3000);
  await socket_list[1].sendMatchState(
    matchIds[0],
    3,
    JSON.stringify({
      response: "11",
    })
  );
  await sleep(3000);
  await socket_list[1].sendMatchState(
    matchIds[0],
    2,
    JSON.stringify({
      question: "22",
    })
  );
  await sleep(3000);
  await socket_list[0].sendMatchState(
    matchIds[0],
    3,
    JSON.stringify({
      response: "22",
    })
  );
  await sleep(3000);
  await socket_list[2].sendMatchState(
    matchIds[0],
    2,
    JSON.stringify({
      question: "33",
    })
  );
  await sleep(3000);
  await socket_list[0].sendMatchState(
    matchIds[0],
    3,
    JSON.stringify({
      response: "33",
    })
  );
}
main();
