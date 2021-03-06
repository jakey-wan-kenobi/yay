/**
* Save card settings (team or individual?) to Firebase.
*/

import _decodeJWT from '../auth/_decodeJWT'
import db from '../account/database'
import getStripeIDFromSlackID from '../stripe/getStripeIDFromSlackID'
import captureException from '../core/captureException'
import raven from 'raven'
import getCookie from '../auth/getCookie'

function setupUpdateCardSettingsRoute (server) {
  server.route('/update-card-settings')
  .all(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', 'https://yay.hintsy.io')
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
      // Decode JWT and proceed if authed.
      const authJWT = getCookie(req.headers.bearer, 'access_token')
      const decodedJWT = _decodeJWT(authJWT)
      if (!decodedJWT) {
        // Capture this event, send a 401, and don't proceed.
        raven.captureMessage('User tried to update their team/individual card setting but was not authed.')
        res.sendStatus(401)
        return
      }
      const stripeID = await getStripeIDFromSlackID(decodedJWT.team_id, decodedJWT.user_id, db)
      const teamStripeID = db.ref('/slack_accounts/' + decodedJWT.team_id + '/team_stripe_id')
      // NOTE: Just checking to see if the key exists. The server is recieving this kind of object: { team: true }
      if (req.body.team === true) {
        // Use this user's stripe_id as the team_stripe_id.
        teamStripeID.set(stripeID)
        res.sendStatus(200)
      }
      if (req.body.team === false) {
        // If this user's stripe_id is being used as the team_stripe_id, remove it. Otherwise do nothing (this prevents us from removing the team_stripe_id when it was somebody else's stripe id there).
        // NOTE: This can be extracted at some point.
        teamStripeID.once('value').then(function (snapshot) {
          if (snapshot.val() === stripeID) {
            teamStripeID.set(null)
          }
          res.sendStatus(200)
        })
      }
    })().catch(function (err) {
      // Error handler
      captureException(err, 'Error handling async function to update credit card team settings (team/individual)', 131008)
    })
  })
}

export default setupUpdateCardSettingsRoute
