/**
* Returns a promise. Resolves to the stripe id of the team, or false.
* @param {String} teamSlackID The Slack ID of the team.
*/

import captureException from '../core/captureException'

function getTeamStripeIDFromTeamSlackID (teamSlackID, db) {
  return new Promise(function (resolve, reject) {
    const teamStripeID = db.ref('/slack_accounts/' + teamSlackID + '/team_stripe_id')
    teamStripeID.once('value').then(function (snapshot) {
      // Check if the team has a team_stripe_id. If not, return.
      if (!snapshot.exists()) {
        resolve(false)
        return
      }
      resolve(snapshot.val())
      return
    }).catch(function (err) {
      captureException(err, 'Error querying database.', 160608)
    })
  })
}

export default getTeamStripeIDFromTeamSlackID
