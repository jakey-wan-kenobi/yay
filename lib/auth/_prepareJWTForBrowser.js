// Create a JWT for this user (this should only be done after confirming identity with Slack)
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
