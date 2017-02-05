/**
* Setup /orders route. We check Stripe to see if this order id is already shipped, whether it's a real order id, etc. Then we conditionally redirect them to another page to indicate if they already inputed a shipping address or the order is already completed.
*/

import express from 'express'

import dotenv from 'dotenv'
dotenv.config()

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

import raven from 'raven'

function setupOrdersRoute (server) {
  server.use('/orders', function (req, res, next) {
    const orderID = req.query.order
    if (!orderID) {
      res.redirect('https://yay.hintsy.io/err/order_not_found')
      raven.captureMessage('User attempted to load order page without an order id.')
      return
    }
    stripe.orders.retrieve(orderID, function (err, order) {
      if (err) {
        // Order id not in Stripe
        res.redirect('https://yay.hintsy.io/err/order_not_found')
        raven.captureMessage('User attempted to load an order that does not exist.')
        return
      } else if (order.status !== 'paid') {
        // If order status is already fulfilled, canceled, etc.
        res.redirect('https://yay.hintsy.io/err/order_fulfilled')
        raven.captureMessage('User attempted to load an order that was already fulfilled.')
        return
      } else if (order.status === 'paid') {
        // Otherwise we're ready to serve the address page
        next()
      }
    })
  })
  server.use('/orders', express.static('../dist'))
}

export default setupOrdersRoute
