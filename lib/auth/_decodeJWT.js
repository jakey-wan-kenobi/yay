// Pass in the req.body.token and get back the decoded JWT
import jwt from 'jsonwebtoken'

function _decodeJWT (token) {
  // jwt.verify() fails if you pass it null or undefined, so this is necessary
  if (!token) return false
  let decoded = jwt.verify(token, process.env.JWT_SECRET)
  return decoded
}

export default _decodeJWT
