/**
* This uses a secret Slack verification token to ensure that events and message buttons are coming from Slack.
* @param {String} token The Slack verification token we got from the request (typically on req.body.token).
*/

import dotenv from 'dotenv'
dotenv.config()

function checkHasSlackOrigin (token) {
  if (token !== process.env.SLACK_VERIFICATION_TOKEN) {
    console.log('Err: not from Slack')
    return false
  } else {
    return true
  }
}

export default checkHasSlackOrigin
