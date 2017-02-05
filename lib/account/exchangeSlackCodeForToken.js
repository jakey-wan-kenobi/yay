/**
* Exchange the Slack code for an access token (see here: https://api.slack.com/methods/oauth.access)
* @todo Is codeRecieved a number or string?
* @returns {Object} A promise. Resolves to the access_token granted in exchange for the code we retrieved from the OAuth flow.
*/

import qs from 'qs'
import axios from 'axios'
import Raven from 'raven'

function exchangeSlackCodeForToken (codeRecieved) {
  let response = axios.post('https://slack.com/apii/oauth.access', qs.stringify({
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    code: codeRecieved
  })).catch(function (error) {
    Raven.captureException(error, {
      extra: {
        description: 'Error accessing a URL with axios',
        id: 196830
      }
    })
  })
  return response
}

export default exchangeSlackCodeForToken
