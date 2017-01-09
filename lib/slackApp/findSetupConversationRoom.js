/**
* When the Yay app is first installed, we find the direct message between the bot and the installing user, and then send that user the first message to initiate the app setup and conduct any onboarding we'd like to conduct.
* @todo Handle http errors.
* @param {String} userID The installing user's Slack user id.
* @param {String} authToken The token which allows us to access the Slack API to retrieve data about this team. Returned from OAuth flow, stored in Firebase.
*/

import qs from 'querystring'
import sendFirstMessage from '../slackApp/sendFirstMessage'
import axios from 'axios'

function findSetupConversationRoom (userID, authToken) {
  // List channel ids that bot has access to
  axios.post('https://slack.com/api/im.list', qs.stringify({
    token: authToken
  })).then(function (response) {
    let ims = response.data.ims
    for (let i = 0; i < ims.length; i++) {
      if (ims[i].user === userID) {
        sendFirstMessage(ims[i].id, authToken)
      }
    }
  }).catch(function (error) {
    // TODO Handle error
    console.log(error)
  })
}

export default findSetupConversationRoom
