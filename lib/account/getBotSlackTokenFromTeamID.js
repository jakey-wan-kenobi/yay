/**
* Accepts a team id, and returns the bot's access token for that team. Returns a promise.
* @param {String} teamID The team id we want the bot token for.
*/

import db from '../account/database'
import raven from 'raven'

function getBotSlackTokenFromTeamID (teamID) {
  return new Promise(function (resolve, reject) {
    const account = db.ref('/slack_accounts/' + teamID + '/bot/bot_access_token')
    account.once('value').then(function (snapshot) {
      resolve(snapshot.val())
      // Error handler
      if (!snapshot.val()) {
        raven.captureException(new Error(), {
          extra: {
            description: 'Null or undefined returned from database query',
            id: 290231
          }
        })
      }
      return
    }, function (err) {
      // Error handler
      raven.captureException(err, {
        extra: {
          description: 'Unable to query database',
          id: 194505
        }
      })
      reject(err)
      return
    })
  })
}

export default getBotSlackTokenFromTeamID
