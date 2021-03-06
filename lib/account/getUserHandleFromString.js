/**
* Parse the username out of a string. For example, returns '@jake' from 'This gift is for @jake'.
* @param {String} text Some bit of text containing a user handle (like '@jake').
* @returns {String} The username, including the '@' symbol. (Although it can be modified to remove the '@').
*/

import captureException from '../core/captureException'

function getUserHandleFromString (text) {
  const recipient = text
  const pattern = /\B@[a-z0-9_-]+/gi
  const userName = recipient.match(pattern)
  if (!userName) {
    // Error handler
    captureException(new Error(), 'Error parsing user name from string', 198978)
    return false
  }
  return userName[0]
  // return userName[0].substr(1) // This removes the '@' symbol, but I decided to keep it
}

export default getUserHandleFromString
