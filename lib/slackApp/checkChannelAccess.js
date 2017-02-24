/**
* This takes a bot auth token and channel id, and checks whether the bot has access to that channel.
* @param {String} token The bot auth token.
* @param {String} id The channel we're testing for.
* @returns {Boolean} Whether or not this channel is accessible to the bot.
*/

import axios from 'axios'
import qs from 'querystring'
import captureException from '../core/captureException'

function checkChannelAccess (token, id) {
  return axios.post('https://slack.com/api/channels.info', qs.stringify({
    token: token,
    channel: id
  })).then(function (response) {
    if (!response.data.ok) {
      return false
    }
    return true
  }).catch(function (error) {
    // Error handler
    captureException(error, 'Error hitting Slack channels.info URL with axios.', 747890)
  })
}

export default checkChannelAccess
