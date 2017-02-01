/**
* Save card settings (team or individual?) to Firebase.
*/

import _decodeJWT from '../auth/_decodeJWT'
import db from '../account/database'
import getStripeIDFromSlackID from '../account/getStripeIDFromSlackID'

function setupUpdateCardSettingsRoute (server) {
  server.route('/update-card-settings')
  .all(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept, Bearer')
    next()
  })
  // This options route is required for the preflight done by the browser
  .options(function (req, res, next) {
    res.status(200).end()
    // next()
  })
  .post(function (req, res, next) {
    // Get user's stripe_id. We'll need it in every scenario below.
    (async function () {
      // Decode JWT. Remember, we'll always have one of these, because we've already checked auth and redirected them if they aren't signed in (via /account route).
      const authJWT = req.headers.bearer.replace('access_token=', '')
      const decodedJWT = _decodeJWT(authJWT)
      const stripeID = await getStripeIDFromSlackID(decodedJWT.team_id, decodedJWT.user_id, db)
      const teamStripeID = db.ref('/slack_accounts/' + decodedJWT.team_id + '/team_stripe_id')
      // NOTE: Just checking to see if the key exists. The server is recieving this kind of object: { individual: '' } or { team: '' }
      if (req.body.team === true) {
        // Use this user's stripe_id as the team_stripe_id.
        teamStripeID.set(stripeID)
        res.sendStatus(200)
      }
      if (req.body.team === false) {
        // If this user's stripe_id is being used as the team_stripe_id, remove it. Otherwise do nothing (this prevents us from removing the team_stripe_id when it was somebody else's stripe id there).
        teamStripeID.once('value').then(function (snapshot) {
          if (snapshot.val() === stripeID) {
            teamStripeID.set(null)
          }
          res.sendStatus(200)
        })
      }
    })().catch(function (err) {
      // TODO: Handle error
      console.log('Err?', err)
    })
  })
}

export default setupUpdateCardSettingsRoute
