"use strict";
var InitModule = function (ctx, logger, nk, initializer) {
    logger.info('TypeScript module loading.');
    initializer.registerMatch(moduleName, {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchSignal: matchSignal,
        matchTerminate: matchTerminate
    });
    initializer.registerRpc('find_match_js', rpcFindMatch);
    initializer.registerRpc('rpc_match_create', rpcCreateMatch);
    logger.info('TypeScript module loaded.');
};
// @ts-ignore
!InitModule && InitModule.bind(null);
var OpCode;
(function (OpCode) {
    OpCode[OpCode["START"] = 1] = "START";
    OpCode[OpCode["QUESTION"] = 2] = "QUESTION";
    OpCode[OpCode["RESPONSE"] = 3] = "RESPONSE";
    OpCode[OpCode["PASS"] = 4] = "PASS";
    OpCode[OpCode["REJECTED"] = 5] = "REJECTED";
    OpCode[OpCode["DONE"] = 6] = "DONE";
})(OpCode || (OpCode = {}));
var moduleName = "tic-tac-toe_js";
function connectedPlayers(s) {
    var count = 0;
    for (var _i = 0, _a = Object.keys(s.presences); _i < _a.length; _i++) {
        var p = _a[_i];
        if (s.presences[p] !== null) {
            count++;
        }
    }
    return count;
}
var matchInit = function (ctx, logger, nk, params) {
    logger.info('Lobby match created');
    var state = {
        presences: {},
        playing: false,
        player: [],
        index: 0,
        speaker: null,
        currentQuestion: null,
        score: null,
        joinsInProgress: 0
    };
    // let presences: {[userId: string]: nkruntime.Presence}
    return {
        state: state,
        tickRate: 1,
        label: ''
    };
};
var matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    logger.info('%q attempted to join Lobby match', ctx.userId);
    if (presence.userId in state.presences) {
        if (state.presences[presence.userId] === null) {
            // User rejoining after a disconnect.
            state.joinsInProgress++;
            return {
                state: state,
                accept: false,
            };
        }
        else {
            return {
                state: state,
                accept: false,
                rejectMessage: 'already joined',
            };
        }
    }
    var accept = (connectedPlayers(state) + state.joinsInProgress) > 2 ? false : true;
    if (!accept) {
        state.playing = true;
        return {
            state: state,
            accept: false,
            rejectMessage: 'match full',
        };
    }
    state.joinsInProgress++;
    return {
        state: state,
        accept: accept
    };
};
var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach(function (presence) {
        state.presences[presence.userId] = presence;
        state.joinsInProgress--;
        logger.info('%q joined Lobby match', presence.userId);
    });
    if (connectedPlayers(state) === 3 && state.joinsInProgress == 0) {
        state.playing = true;
        state.player = Object.keys(state.presences);
        state.speaker = state.player[state.index];
        var score = {};
        for (var item in state.presences) {
            score[item] = 0;
        }
        state.score = JSON.parse(JSON.stringify(score));
        var msg = {
            speaker: state.speaker,
            score: state.score,
            message: "START!"
        };
        dispatcher.broadcastMessage(OpCode.START, JSON.stringify(msg), null, null, true);
        logger.info("be readly", state);
    }
    return {
        state: state
    };
};
var matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach(function (presence) {
        delete (state.presences[presence.userId]);
        logger.info('%q left Lobby match', presence.userId);
    });
    return {
        state: state
    };
};
var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    if (!state.playing) {
        for (var userID in state.presences) {
            if (state.presences[userID] === null) {
                delete state.presences[userID];
            }
        }
    }
    else {
        var msg = void 0;
        for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
            var message = messages_1[_i];
            logger.info("MESSAGE", message);
            switch (message.opCode) {
                case OpCode.QUESTION:
                    if (state.currentQuestion) {
                        dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({ message: "There are currently questions！" }), [message.sender]);
                        break;
                    }
                    if (message.sender.userId != state.speaker) {
                        dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({ message: "Can't ask questions！", speaker: state.speaker, self: message.sender }), [message.sender]);
                        break;
                    }
                    logger.info('QUESTION', message);
                    state.currentQuestion = JSON.parse(nk.binaryToString(message.data))["question"];
                    msg = {
                        speaker: state.speaker,
                        currentQuestion: state.currentQuestion,
                        message: "QUESTION"
                    };
                    dispatcher.broadcastMessage(OpCode.QUESTION, JSON.stringify(msg));
                    break;
                case OpCode.RESPONSE:
                    if (message.sender.userId == state.speaker) {
                        dispatcher.broadcastMessage(OpCode.REJECTED, null, [message.sender]);
                        break;
                    }
                    logger.info('RESPONSE', message);
                    var response = JSON.parse(nk.binaryToString(message.data))["response"];
                    if (response == state.currentQuestion) {
                        state.score[message.sender.userId]++;
                        msg = {
                            speaker: state.speaker,
                            currentQuestion: state.currentQuestion,
                            respondent: message.sender.userId,
                            currentResponse: response,
                            score: state.score,
                            success: true,
                        };
                        state.currentQuestion = null;
                        dispatcher.broadcastMessage(OpCode.RESPONSE, JSON.stringify(msg));
                        if (state.score[message.sender.userId] > 1) {
                            msg = {
                                winner: message.sender.userId,
                                score: state.score
                            };
                            dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(msg));
                            return null;
                        }
                        state.index++;
                        if (state.index == 3) {
                            state.index = 0;
                        }
                        state.speaker = state.player[state.index];
                        msg = {
                            speaker: state.speaker,
                        };
                        dispatcher.broadcastMessage(OpCode.RESPONSE, JSON.stringify(msg));
                    }
                    else {
                        state.score[message.sender.userId]--;
                        msg = {
                            speaker: state.speaker,
                            currentQuestion: state.currentQuestion,
                            respondent: message.sender.userId,
                            currentResponse: response,
                            score: state.score,
                            success: false,
                        };
                        dispatcher.broadcastMessage(OpCode.RESPONSE, JSON.stringify(msg));
                    }
                    break;
                case OpCode.PASS:
                    state.currentQuestion = null;
                    state.index++;
                    if (state.index == 3) {
                        state.index = 0;
                    }
                    state.speaker = state.player[state.index];
                    msg = {
                        speaker: state.speaker,
                    };
                    dispatcher.broadcastMessage(OpCode.PASS, JSON.stringify(msg));
                    break;
            }
        }
    }
    return {
        state: state
    };
};
var matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    logger.info('Lobby match terminated');
    var message = "Server shutting down in ".concat(graceSeconds, " seconds.");
    dispatcher.broadcastMessage(2, message, null, null);
    return {
        state: state
    };
};
var matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
    logger.info('Lobby match signal received: ' + data);
    return {
        state: state,
        data: "Lobby match signal received: " + data
    };
};
var rpcFindMatch = function (ctx, logger, nk, payload) {
    if (!ctx.userId) {
        throw Error('No user ID in context');
    }
    if (!payload) {
        throw Error('Expects payload.');
    }
    var request = {};
    try {
        request = JSON.parse(payload);
    }
    catch (error) {
        logger.error('Error parsing json message: %q', error);
        throw error;
    }
    var matches;
    try {
        var query = "+label.open:1 +label.fast:".concat(request.fast ? 1 : 0);
        matches = nk.matchList(10, true, null, null, 1, query);
    }
    catch (error) {
        logger.error('Error listing matches: %v', error);
        throw error;
    }
    var matchIds = [];
    if (matches.length > 0) {
        // There are one or more ongoing matches the user could join.
        matchIds = matches.map(function (m) { return m.matchId; });
    }
    else {
        // No available matches found, create a new one.
        try {
            matchIds.push(nk.matchCreate(moduleName, { fast: request.fast }));
        }
        catch (error) {
            logger.error('Error creating match: %v', error);
            throw error;
        }
    }
    var res = { matchIds: matchIds };
    return JSON.stringify(res);
};
function rpcCreateMatch(context, logger, nk, payload) {
    logger.info(payload);
    // @ts-ignore
    var matchId = nk.matchCreate(moduleName, payload);
    return JSON.stringify({ matchId: matchId });
}
