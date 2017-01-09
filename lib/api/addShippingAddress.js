/* *******************************************
    ADD SHIPPING ADDRESS TO STRIPE ORDER
*********************************************/

import bodyParser from 'body-parser'

import dotenv from 'dotenv'
dotenv.config()

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

function setupAddShippingRoute (server) {
  server.use(bodyParser.urlencoded({ extended: false }))
  server.route('/add-shipping-address')
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
    const address = req.body
    const orderID = req.query.order
    // Add the address to this orderID in Stripe
    stripe.orders.update(orderID, {
      metadata: {
        address_line1: address.line1,
        address_line2: address.line2,
        address_city: address.city,
        address_postal_code: address.postal_code,
        address_state: address.state
      }
    }, function (err, data) {
      console.log(err, data)
      if (err) {
        // TODO: Handle this error. Something went wrong, tell the user.
        res.status(500).send(err)
        return
      }
      // Send success response to client.
      res.send(200)
    })
  })
}

export default setupAddShippingRoute
