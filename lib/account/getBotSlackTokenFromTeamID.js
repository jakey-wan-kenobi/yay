/**
* Accepts a team id, and returns the bot's access token for that team. Returns a promise.
* @param {String} teamID The team id we want the bot token for.
*/

import db from '../account/database'
import captureException from '../core/captureException'

function getBotSlackTokenFromTeamID (teamID) {
  return new Promise(function (resolve, reject) {
    const account = db.ref('/slack_accounts/' + teamID + '/bot/bot_access_token')
    account.once('value').then(function (snapshot) {
      resolve(snapshot.val())
      // Error handler
      if (!snapshot.val()) {
        captureException(new Error(), 'Null or undefined returned from database query', 290231)
      }
      return
    }, function (err) {
      captureException(err, 'Unable to query database', 194505)
      reject(err)
      return
    })
  })
}

export default getBotSlackTokenFromTeamID
