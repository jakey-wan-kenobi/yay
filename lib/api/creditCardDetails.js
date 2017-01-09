/**
* Sets up a route that lets you retrieve a customer's default payment source details, which includes the card's last4 and brand. The POST should include the JWT, which will allow us to identify them, and go get their info from Stripe.
* @todo What if a JWT doesn't come with the request? We need to redirect them.
*/

import getStripeIDFromSlackID from '../account/getStripeIDFromSlackID'
import getStripeCustomerDetails from '../account/getStripeCustomerDetails'
import getCardFromStripeData from '../account/getCardFromStripeData'
import co from 'co'
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
    co(function * () {
      // Get user's stripe ID
      const stripeID = yield getStripeIDFromSlackID(decodedJWT.team_id, decodedJWT.user_id, db)
      // Handle if user doesn't have a Stripe ID yet (because they haven't previously added a card). Just close the request with a response and end.
      if (!stripeID) {
        res.sendStatus(200)
        return
      }
      // Get user's credit card info using stripe ID
      const customerData = yield getStripeCustomerDetails(stripeID)
      // NOTE: Do we really need this? Handle if customer doesn't have any credit cards yet (but for some reason has a Stripe ID). Weird but possible I guess.
      if (!customerData.sources) {
        res.sendStatus(200)
        return
      }
      const card = getCardFromStripeData(customerData)
      res.send(card)
    })
  })
}

export default setupCreditCardRoute
