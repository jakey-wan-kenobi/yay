/**
* Introduce Yay (and Stanley) to the Slack team in the 'general' channel.
* @todo Extract getBotSlackTokenFromTeamID into a separate component.
*/

import axios from 'axios'
import qs from 'querystring'
import db from '../account/database.js'
import getTeamIntroMessage from '../slackApp/getTeamIntroMessage'
import captureException from '../core/captureException'

function sendIntroToTeam (responseData) {
  const teamID = responseData.team.id
  async function _getGeneralChannel (teamID) {
    const token = await _getBotSlackTokenFromTeamID(teamID)
    // List channel ids that bot has access to, to find '#general'. NOTE: This token MUST be the bot's token, because only it has the proper channels:read permission/scope to use the channels.list method in Slack.
    axios.post('https://slack.com/api/channels.list', qs.stringify({
      token: token
    })).then(function (response) {
      let channels = response.data.channels
      for (let i = 0; i < channels.length; i++) {
        if (channels[i].is_general === true) {
          // Post message to the #general channel
          const introMessage = getTeamIntroMessage(token, channels[i].id)
          axios.post('https://slack.com/api/chat.postMessage', introMessage).then(function (response) {
            // Do anything with response?
          }).catch(function (error) {
            captureException(error, 'Error reaching Slack API.', 954790)
          })
        }
      }
    }).catch(function (error) {
      captureException(error, 'Error reaching Slack API.', 170551)
    })
  }
  // Call our async function
  _getGeneralChannel(teamID).catch(function (err) {
    captureException(err, 'Error running async function to getGeneralChannel.', 376789)
  })
}

function _getBotSlackTokenFromTeamID (teamID) {
  return new Promise(function (resolve, reject) {
    // TODO: Extract getBotSlackTokenFromTeamID() into a component.
    const account = db.ref('/slack_accounts/' + teamID + '/bot/bot_access_token')
    account.once('value').then(function (snapshot) {
      resolve(snapshot.val())
      return
    }, function (err) {
      reject(err)
      captureException(err, 'Error querying database.', 208498)
      return
    })
  })
}

export default sendIntroToTeam
