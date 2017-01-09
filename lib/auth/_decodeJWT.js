/**
* Decode a JWT. Take the authentication string and transform it into an object.
* @param {String} token A JWT. The 'access_token' that's stored in the cookie on the browser.
*/

import jwt from 'jsonwebtoken'

function _decodeJWT (token) {
  // jwt.verify() fails if you pass it null or undefined, so this is necessary
  if (!token) return false
  let decoded = jwt.verify(token, process.env.JWT_SECRET)
  return decoded
}

export default _decodeJWT
