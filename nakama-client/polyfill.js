require("isomorphic-fetch");
const globalExt = {};
globalExt.Buffer = global.Buffer || require("buffer").Buffer;

if (typeof btoa === "undefined") {
  globalExt["btoa"] = function (str) {
    return new Buffer(str, "binary").toString("base64");
  };
}

if (typeof atob === "undefined") {
  globalExt["atob"] = function (b64Encoded) {
    return new Buffer(b64Encoded, "base64").toString("binary");
  };
}

globalExt["WebSocket"] = require("ws");
globalExt["self"] = {};
globalExt["window"] = { console: console };

Object.assign(global, globalExt);
