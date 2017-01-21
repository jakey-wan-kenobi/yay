/**
* Retrieves the relevant Slack access token based on the team id given. Returns a promise.
* @param {String} teamID The team id used to retrieve the Slack token.
*/

import db from '../account/database'

function getSlackTokenFromTeamID (teamID) {
  return new Promise(function (resolve, reject) {
    const teamAccountToken = db.ref('/slack_accounts/' + teamID + '/access_token')
    teamAccountToken.once('value').then(function (snapshot) {
      const accessToken = snapshot.val()
      resolve(accessToken)
    }, function (err) {
      // TODO: Handle error
      console.log(err)
      reject(err)
    })
  })
}

export default getSlackTokenFromTeamID
