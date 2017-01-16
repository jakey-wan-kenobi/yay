/**
* Introduce Yay (and Stanley) to the Slack team in the 'general' channel.
* @todo Extract getBotSlackTokenFromTeamID into a separate component.
*/

import axios from 'axios'
import qs from 'querystring'
import db from '../account/database.js'
import getTeamIntroMessage from '../account/getTeamIntroMessage'

function sendIntroToTeam (responseData) {
  const teamID = responseData.team.id
  async function _getGeneralChannel (teamID) {
    const token = await _getBotSlackTokenFromTeamID(teamID, responseData)
    // List channel ids that bot has access to, to find '#general'
    axios.post('https://slack.com/api/channels.list', qs.stringify({
      token: token
    })).then(function (response) {
      let channels = response.data.channels
      for (let i = 0; i < channels.length; i++) {
        if (channels[i].is_general === true) {
          // Post message to the #general channel
          const introMessage = getTeamIntroMessage(token, channels[i].id)
          axios.post('https://slack.com/api/chat.postMessage', introMessage).then(function (response) {
            // NOTE Do we need to do anything with this response?
            console.log('worked')
          }).catch(function (error) {
            // TODO Handle error
            console.log(error)
          })
        }
      }
    }).catch(function (error) {
      // TODO Handle error
      console.log(error)
    })
  }
  // Call our async function
  _getGeneralChannel(teamID).catch(function (err) {
    console.log(err)
  })
}

function _getBotSlackTokenFromTeamID (teamID, responseData) {
  return new Promise(function (resolve, reject) {
    // TODO: Extract getBotSlackTokenFromTeamID() into a component.
    const account = db.ref('/slack_accounts/' + responseData.team.id + '/bot/bot_access_token')
    account.once('value').then(function (snapshot) {
      console.log(snapshot.val())
      resolve(snapshot.val())
      return snapshot.val()
    }, function (err) {
      reject(err)
      return err
    })
  })
}

export default sendIntroToTeam
