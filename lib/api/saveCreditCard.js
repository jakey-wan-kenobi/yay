/**
* Save a default credit card payment for a Stripe user (or create a new Stripe user and save to it).
*/

import getCardFromStripeData from '../stripe/getCardFromStripeData'
import checkDatabaseForStripeID from '../stripe/checkDatabaseForStripeID'
import updateOrCreateStripeCustomer from '../stripe/updateOrCreateStripeCustomer'
import _decodeJWT from '../auth/_decodeJWT'
import db from '../account/database'
import bodyParser from 'body-parser'
import captureException from '../core/captureException'

function setupSaveCreditCardRoute (server) {
  server.use(bodyParser.json())
  server.route('/save-order-details')
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
      // Auth the request. This isn't the most optimal solution because it relies on getting the cookie/JWT in the format 'access_token=XYZ'
      const authJWT = req.headers.bearer.replace('access_token=', '')
      const decodedJWT = _decodeJWT(authJWT)
      // If not authed, send a 403 and return
      if (!decodedJWT) {
        res.send(403)
        return
      }
      const creditCard = req.body.card ? req.body : null
      // If we don't have a 'card' in the request body, something went wrong. Handle error.
      if (!creditCard) {
        captureException(new Error(), 'No credit card included in save credit card request body', 258101)
        // TODO: Send 500 status page back to view.
        res.status(500).send('Something went wrong!')
        return
      }
      (async function () {
        let stripeIDCheck = await checkDatabaseForStripeID(decodedJWT, db)
        let customer = await updateOrCreateStripeCustomer(stripeIDCheck, creditCard, decodedJWT, db)
        let card = getCardFromStripeData(customer)
        // Send the credit card data back to client (for success/fail message) TODO: What happens if we failed? See below.
        res.send(card)
      }).catch(function (err) {
        // Error handler
        captureException(err, 'Error running async function in save credit card route', 142188)
      })
    })
}

// TODO: This shouldn't crash the app.
// let test = getCardFromStripeData('test')
// console.log('test', test)

export default setupSaveCreditCardRoute
