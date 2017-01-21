/**
* Accepts a team id, and returns the bot's access token for that team. Returns a promise.
* @param {String} teamID The team id we want the bot token for.
*/

import db from '../account/database'

function getBotSlackTokenFromTeamID (teamID) {
  return new Promise(function (resolve, reject) {
    // TODO: Extract getBotSlackTokenFromTeamID() into a component.
    const account = db.ref('/slack_accounts/' + teamID + '/bot/bot_access_token')
    account.once('value').then(function (snapshot) {
      resolve(snapshot.val())
      return snapshot.val()
    }, function (err) {
      reject(err)
      return err
    })
  })
}

export default getBotSlackTokenFromTeamID
