/**
* Exchange the Slack code for an access token (see here: https://api.slack.com/methods/oauth.access)
* @todo Is codeRecieved a number or string?
* @returns {Object} A promise. Resolves to the access_token granted in exchange for the code we retrieved from the OAuth flow.
* @todo Handle when the Promise object returned resolves to an error object.
*/

import qs from 'qs'
import axios from 'axios'
import captureException from '../core/captureException'

function exchangeSlackCodeForToken (codeRecieved) {
  let response = axios.post('https://slack.com/api/oauth.access', qs.stringify({
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    code: codeRecieved
  })).catch(function (error) {
    captureException(error, 'Error accessing a URL with axios', 196830)
  })
  return response
}

export default exchangeSlackCodeForToken
