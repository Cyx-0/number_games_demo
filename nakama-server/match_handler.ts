const moduleName = "tic-tac-toe_js";

function connectedPlayers(s:any): number {
    let count = 0;
    for(const p of Object.keys(s.presences)) {
        if (s.presences[p] !== null) {
            count++;
        }
    }
    return count;
}

const matchInit = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: { [key: string]: string }): { state: nkruntime.MatchState, tickRate: number, label: string } {
  logger.info('Lobby match created');

  var state = {
    presences: {},
    playing: false,
    player: [],
    index: 0,
    speaker: null,
    currentQuestion: null,
    score:null,
    joinsInProgress:0
  }
  // let presences: {[userId: string]: nkruntime.Presence}

  return {
    state: state,
    tickRate: 1,
    label: ''
  };
};

const matchJoinAttempt = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presence: nkruntime.Presence, metadata: {[key: string]: any }) : {state: nkruntime.MatchState, accept: boolean, rejectMessage?: string | undefined } | null {
  logger.info('%q attempted to join Lobby match', ctx.userId);
  if (presence.userId in state.presences) {
      if (state.presences[presence.userId] === null) {
          // User rejoining after a disconnect.
          state.joinsInProgress++;
          return {
              state: state,
              accept: false,
          }
      } else {
        return {
            state: state,
            accept: false,
            rejectMessage: 'already joined',
        }
      }
  }
  const accept = (connectedPlayers(state)+state.joinsInProgress) > 2 ? false : true
  if (!accept) {
    state.playing = true
    return {
        state: state,
        accept: false,
        rejectMessage: 'match full',
    };
  }
  state.joinsInProgress++
  return {
    state,
    accept: accept
  };
}

const matchJoin = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[]): { state: nkruntime.MatchState } | null {
  presences.forEach(function (presence) {
    state.presences[presence.userId] = presence;
    state.joinsInProgress--
    logger.info('%q joined Lobby match', presence.userId);
  })
  if (connectedPlayers(state) === 3 && state.joinsInProgress == 0) {
    state.playing = true
    state.player = Object.keys(state.presences)
    state.speaker = state.player[state.index]
    let score:any = {}
    for (let item in state.presences) {
      score[item] = 0
    }
    state.score = JSON.parse(JSON.stringify(score))
    let msg = {
      speaker: state.speaker,
      score: state.score,
      message:"START!"
    }
    dispatcher.broadcastMessage(OpCode.START, JSON.stringify(msg), null, null, true)
    logger.info("be readly",state)
  }
  return {
    state
  }
}

const matchLeave = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[]) : { state: nkruntime.MatchState } | null {
  presences.forEach(function (presence) {
    delete (state.presences[presence.userId]);
    logger.info('%q left Lobby match', presence.userId);
  });
  return {
    state
  };
}

const matchLoop = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, messages: nkruntime.MatchMessage[]) : { state: nkruntime.MatchState} | null {
    if (!state.playing) {
      for (let userID in state.presences) {
        if (state.presences[userID] === null) {
            delete state.presences[userID];
        }
      }
    } else {
      let msg: ResponseMessageResp | QuestionMessageResp | PassMessageResp | DoneMessageResp
      for (const message of messages) {
        logger.info("MESSAGE",message)
        switch (message.opCode) {
          case OpCode.QUESTION:
            if (state.currentQuestion) {
              dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({message:"There are currently questions！"}), [message.sender]);
              break
            }
            if (message.sender.userId != state.speaker) {
              dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({message:"Can't ask questions！",speaker:state.speaker,self:message.sender}), [message.sender]);
              break
            }

            logger.info('QUESTION',message)
            state.currentQuestion = JSON.parse(nk.binaryToString(message.data))["question"]
            msg = {
              speaker: state.speaker,
              currentQuestion: state.currentQuestion,
              message:"QUESTION"
            }
            dispatcher.broadcastMessage(OpCode.QUESTION, JSON.stringify(msg));
            break
          case OpCode.RESPONSE:
            if (message.sender.userId == state.speaker) {
              dispatcher.broadcastMessage(OpCode.REJECTED, null, [message.sender]);
              break
            }
            logger.info('RESPONSE',message)
            const response = JSON.parse(nk.binaryToString(message.data))["response"]
            if (response == state.currentQuestion) {
              state.score[message.sender.userId]++

              msg = {
                speaker: state.speaker,
                currentQuestion: state.currentQuestion,
                respondent: message.sender.userId,
                currentResponse: response,
                score: state.score,
                success: true,
              }
              state.currentQuestion = null
              dispatcher.broadcastMessage(OpCode.RESPONSE, JSON.stringify(msg));

              if (state.score[message.sender.userId] > 1) {
                msg = {
                  winner: message.sender.userId,
                  score: state.score
                }
                dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(msg));
                return null
              }

              state.index++
              if (state.index == 3) {
                state.index = 0
              }
              state.speaker = state.player[state.index]
              msg = {
                speaker: state.speaker,
              }
              dispatcher.broadcastMessage(OpCode.RESPONSE, JSON.stringify(msg));

            } else {
              state.score[message.sender.userId]--
              msg = {
                speaker: state.speaker,
                currentQuestion: state.currentQuestion,
                respondent: message.sender.userId,
                currentResponse: response,
                score: state.score,
                success: false,
              }
              dispatcher.broadcastMessage(OpCode.RESPONSE, JSON.stringify(msg));
            }
            break
          case OpCode.PASS:
            state.currentQuestion = null
            state.index++
            if (state.index == 3) {
              state.index = 0
            }
            state.speaker = state.player[state.index]
            msg = {
              speaker: state.speaker,
            }
            dispatcher.broadcastMessage(OpCode.PASS, JSON.stringify(msg));
            break
        }
      }
    }
    return {
      state
    };
}

const matchTerminate = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, graceSeconds: number) : { state: nkruntime.MatchState} | null {
  logger.info('Lobby match terminated');

  const message = `Server shutting down in ${graceSeconds} seconds.`;
  dispatcher.broadcastMessage(2, message, null, null);

  return {
    state
  };
}

const matchSignal = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, data: string) : { state: nkruntime.MatchState, data?: string } | null {
  logger.info('Lobby match signal received: ' + data);

  return {
    state,
    data: "Lobby match signal received: " + data
  };
}

