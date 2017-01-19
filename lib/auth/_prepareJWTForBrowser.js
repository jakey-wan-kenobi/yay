/**
* Create a JWT for this user. Important: This should only be done immediately after confirming identity with Slack OAuth flow.
* @param {Object} data The user data we got back from the Slack OAuth flow.
* @param {String} name The real name of the user.
* @returns {String} An encoded JWT. This is ready to be sent to the client.
*/

import jwt from 'jsonwebtoken'

function _prepareJWTForBrowser (data, name) {
  let token = jwt.sign({
    user_id: data.user_id,
    team_id: data.team_id,
    user_name: name
  }, process.env.JWT_SECRET, { expiresIn: '24h' })
  return token
}

export default _prepareJWTForBrowser
