/**
* Sets up a route that lets you retrieve a customer's default payment source details, which includes the card's last4 and brand. The POST should include the JWT, which will allow us to identify them, and go get their info from Stripe. We also want to retrieve whether or not this card is the default payment source for the ENTIRE Slack team.
* @todo What if a JWT doesn't come with the request? We need to redirect them.
*/

import getStripeIDFromSlackID from '../account/getStripeIDFromSlackID'
import getStripeCustomerDetails from '../account/getStripeCustomerDetails'
import getCardFromStripeData from '../account/getCardFromStripeData'
import getTeamStripeIDFromTeamSlackID from '../account/getTeamStripeIDFromTeamSlackID'
import _decodeJWT from '../auth/_decodeJWT'
import db from '../account/database'

function setupCreditCardRoute (server) {
  server.route('/credit-card-details')
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
    // Decode JWT. Remember, we'll always have one of these, because we've already checked auth and redirected them if they aren't signed in (via /account route).
    const authJWT = req.headers.bearer.replace('access_token=', '')
    const decodedJWT = _decodeJWT(authJWT)
    async function _runLogic () {
      const response = {}
      // TODO: These can run parallel, no need for one to wait for the other
      const teamStripeID = await getTeamStripeIDFromTeamSlackID(decodedJWT.team_id, db)
      const stripeID = await getStripeIDFromSlackID(decodedJWT.team_id, decodedJWT.user_id, db)
      // If there is a teamStripeID and it isn't the same as the user's stripeID, then retrieve the team card details. Otherwise, we don't need to.
      if (teamStripeID && teamStripeID !== stripeID) {
        // TODO: Send this info back to view. This user's card is for the whole team. Set toggle to ON and don't show it in the card.
        const teamStripeData = await getStripeCustomerDetails(teamStripeID)
        // if (!teamStripeData) return
        const teamCard = await getCardFromStripeData(teamStripeData)
        // TODO: Send this back to view.
        response.teamCard = teamCard
      }
      // If there isn't a teamStripeID or stripeID, we don't need to send anything back.
      if (!stripeID && !teamStripeID) {
        res.sendStatus(200)
        return
      }
      // If the user has a stripeID, retrieve their card
      if (stripeID) {
        // If there is a stripeID, retrieve the card
        const stripeData = await getStripeCustomerDetails(stripeID)
        // NOTE: Do we really need this? Handle if customer doesn't have any credit cards yet (but for some reason has a Stripe ID). Weird but possible I guess.
        if (!stripeData.sources) {
          res.sendStatus(200)
          return
        }
        response.card = getCardFromStripeData(stripeData)
      }
      res.send(response)
    }
    _runLogic().catch(function (err) {
      // TODO: Handle error.
      console.log(err)
    })
  })
}

export default setupCreditCardRoute
