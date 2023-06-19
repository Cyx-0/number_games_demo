let InitModule: nkruntime.InitModule = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
  logger.info('TypeScript module loading.');
  initializer.registerMatch(moduleName, {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchSignal,
    matchTerminate
  });
  initializer.registerRpc('find_match_js', rpcFindMatch);
  
  initializer.registerRpc('rpc_match_create', rpcCreateMatch);
  logger.info('TypeScript module loaded.');
}

// @ts-ignore
!InitModule && InitModule.bind(null);