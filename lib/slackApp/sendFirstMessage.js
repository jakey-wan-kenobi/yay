/**
* Send the first message to the Slack user who installed the app, so we can onboard them and finish setup.
* @todo For some reason we can't parse the array on 'attachments' (so they get dropped off). It has something to do with the qs.stringify. Perhaps if we format differently it'll work.
* @todo Handle errors.
* @param {String} channelID This is the id of the Slack channel we're going to send to.
* @param {String} authToken The Slack API token for this team, which allows to send the message to the user.
*/

import axios from 'axios'
import getIntroMessage from '../slackApp/getIntroMessage'
import captureException from '../core/captureException'

function sendFirstMessage (channelID, authToken) {
  const data = getIntroMessage(channelID, authToken, undefined)
  axios.post('https://slack.com/api/chat.postMessage', data).then(function (response) {
    // NOTE Do we need to do anything with this response?
  }).catch(function (error) {
    captureException(error, 'Error reaching Slack API.', 157635)
  })
}

export default sendFirstMessage
