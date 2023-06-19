// nakama-js.cjs.js

require("es6-promise").polyfill();
require("isomorphic-fetch");
const URLSearchParams = require("url-search-params");
var WebSocket = require("ws");
var self = {}; // dont forget this also, in node this object will not be created
