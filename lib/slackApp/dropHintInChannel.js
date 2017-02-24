/**
* Drop a hint that a prize was purchased in a channel.
* @param {String} channelID The id of the channel we're sending this to.
* @param {String} teamID The team id.
* @param {String} timestamp The timestamp of the message that was clicked. We need this in order to publicly broadcast this message to the channel (reply_broadcast).
*/

import getBotSlackTokenFromTeamID from '../account/getBotSlackTokenFromTeamID'
import axios from 'axios'
import qs from 'querystring'
import captureException from '../core/captureException'

function dropHintInChannel (channelID, teamID, timestamp) {
  (async function () {
    // Get both botTokenPromise and authTokenPromise started at the same time. Then await both to continue.
    const botTokenPromise = getBotSlackTokenFromTeamID(teamID)
    const botToken = await botTokenPromise
    // FIRST TRY. First try sending as the bot (composing a bot specific message to send to Slack). If we get a 'channel_not_found' response, then we'll recompose and send as user.
    let message = _composeMessage(botToken, channelID)
    _postMessage(message).then(function (response) {
      // Handle error
      if (!response.data.ok) {
        captureException(response.data, 'Error or warning dropping hint in Slack channel.', 243883)
        return
      }
    })
  })().catch(function (err) {
    captureException(err, 'Error running async function in dropHintInChannel.js', 148434)
  })
}

// This will compose the message, taking a boolean which indicates whether we should post as the bot or the user.
function _composeMessage (token, channelID) {
  return qs.stringify({
    'token': token,
    'channel': channelID,
    'text': 'WOOOOOO!!! Somebody\'s gettin\' a prize!!! 🦄 🎉 👻 👏 🎁',
    'attachments': JSON.stringify([
      {
        'fallback': 'Couldn\'t show image.',
        'color': '#59FFBA',
        'image_url': 'https://media.giphy.com/media/y8Mz1yj13s3kI/giphy.gif'
        // https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif
        // https://media.giphy.com/media/3o6ZtbdkqxJA5qNZp6/giphy.gif
        // https://media.giphy.com/media/l41Yh18f5TbiWHE0o/giphy.gif
        // https://media.giphy.com/media/l0HlN5Y28D9MzzcRy/source.gif
      }
    ])
  })
}

// Post the message to the channelID as the bot, and if that doesn't work, rebuild the message and try again as the user.
function _postMessage (message) {
  return axios.post('https://slack.com/api/chat.postMessage', message).catch(function (error) {
    captureException(error, 'Error fetching data from Slack URL.', 243985)
  })
}

export default dropHintInChannel
