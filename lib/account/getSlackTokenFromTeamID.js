/**
* Retrieves the relevant Slack access token based on the team id given. Returns a promise.
* @param {String} teamID The team id used to retrieve the Slack token.
*/

import db from '../account/database'
import captureException from '../core/captureException'

function getSlackTokenFromTeamID (teamID) {
  return new Promise(function (resolve, reject) {
    const teamAccountToken = db.ref('/slack_accounts/' + teamID + '/access_token')
    teamAccountToken.once('value').then(function (snapshot) {
      const accessToken = snapshot.val()
      resolve(accessToken)
      // Error handler
      if (!accessToken) {
        captureException(new Error(), 'Null or undefined returned from database query', 248049)
      }
      return
    }, function (err) {
      // Error handler
      captureException(err, 'Unable to query database', 167686)
      reject(err)
    })
  })
}

export default getSlackTokenFromTeamID
