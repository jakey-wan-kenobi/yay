/**
* Drop a hint that a prize was purchased in a channel.
* @param {String} channelID The id of the channel we're sending this to.
* @param {String} teamID The team id.
* @param {String} timestamp The timestamp of the message that was clicked. We need this in order to publicly broadcast this message to the channel (reply_broadcast).
*/

import getBotSlackTokenFromTeamID from '../account/getBotSlackTokenFromTeamID'
import axios from 'axios'
import qs from 'querystring'

function dropHintInChannel (channelID, teamID, timestamp) {
  (async function () {
    const botToken = await getBotSlackTokenFromTeamID(teamID)
    const message = qs.stringify({
      'token': botToken,
      'channel': channelID,
      'text': 'WOOOOOO!!! Somebody\'s gettin\' a prize!!! 🦄 🎉 👻 🚀',
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
    axios.post('https://slack.com/api/chat.postMessage', message).then(function (response) {
      // NOTE Do we need to do anything with this response?
    }).catch(function (error) {
      // TODO Handle error
      console.log(error)
    })
  })()
}

export default dropHintInChannel
