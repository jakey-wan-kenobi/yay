/**
* Save a default credit card payment for a Stripe user (or create a new Stripe user and save to it).
*/

import getCardFromStripeData from '../stripe/getCardFromStripeData'
import checkDatabaseForStripeID from '../stripe/checkDatabaseForStripeID'
import updateOrCreateStripeCustomer from '../stripe/updateOrCreateStripeCustomer'
import _decodeJWT from '../auth/_decodeJWT'
import db from '../account/database'
import bodyParser from 'body-parser'

function setupSaveCreditCardRoute (server) {
  server.use(bodyParser.json())
  server.route('/save-order-details')
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
      // TODO: Auth the request. This isn't the most optimal solution because it relies on getting the cookie/JWT in the format 'access_token=XYZ'
      let authJWT = req.headers.bearer.replace('access_token=', '')
      let creditCard = req.body.card ? req.body : null
      // If no bearer token (JWT cookie) includedin request, send 403 and return
      if (!authJWT) {
        res.sendStatus(403)
        return
      }
      let decodedJWT = _decodeJWT(authJWT)
      // If not authed, send a 403 and return
      if (!decodedJWT) {
        res.send(403)
        return
      }
      async function _runLogic () {
        let stripeIDCheck = await checkDatabaseForStripeID(decodedJWT, db)
        let customer = await updateOrCreateStripeCustomer(stripeIDCheck, creditCard, decodedJWT, db)
        let card = getCardFromStripeData(customer)
        // Send the credit card data back to client (for success/fail message) TODO: What happens if we failed?
        res.send(card)
      }
      _runLogic().catch(function (err) {
        // TODO: Handle error.
        console.log(err)
      })
    })
}

export default setupSaveCreditCardRoute
