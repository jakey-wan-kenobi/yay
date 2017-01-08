"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
// Take '@jake' and returns 'jake'
function getUserNameFromHandle(text) {
  var recipient = text;
  var pattern = /\B@[a-z0-9_-]+/gi;
  var userName = recipient.match(pattern);
  if (!userName) {
    return false;
  }
  return userName[0];
  // return userName[0].substr(1) // This removes the '@' symbol, but I decided to keep it
}

exports.default = getUserNameFromHandle;