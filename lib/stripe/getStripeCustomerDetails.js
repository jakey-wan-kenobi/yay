/**
* Get Stripe customer data from the Stripe customer id.
* @todo Is the stripeID a number or a string? Docuement this.
* @returns {Object} Stripe customer object, with details about this Stripe customer (payment, etc.)
*/

import dotenv from 'dotenv'
dotenv.config()

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

import captureException from '../core/captureException'

function getStripeCustomerDetails (stripeID) {
  return new Promise(function (resolve, reject) {
    stripe.customers.retrieve(stripeID, function (err, customer) {
      if (err) {
        reject(err)
        captureException(err, 'Error getting customer from Stripe.', 944590)
        return
      }
      resolve(customer)
      return
    })
  })
}

export default getStripeCustomerDetails
