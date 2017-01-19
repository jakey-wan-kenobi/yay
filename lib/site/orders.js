/**
* Setup /orders route. We check Stripe to see if this order id is already shipped, whether it's a real order id, etc. Then we conditionally redirect them to another page to indicate if they already inputed a shipping address or the order is already completed.
*/

import express from 'express'

import dotenv from 'dotenv'
dotenv.config()

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

function setupOrdersRoute (server) {
  server.use('/orders', function (req, res, next) {
    const orderID = req.query.order
    stripe.orders.retrieve(orderID, function (err, order) {
      if (err) {
        // Order id not in Stripe
        res.redirect('https://yay.hintsy.io/err/order_not_found')
      } else if (order.status !== ('created' || 'paid')) {
        // If order status is already fulfilled, canceled, etc.
        res.redirect('https://yay.hintsy.io/err/order_fulfilled')
      } else if (order.status === ('created' || 'paid')) {
        // Otherwise we're ready to serve the address page
        next()
      }
    })
  })
  server.use('/orders', express.static('../dist'))
}

export default setupOrdersRoute
