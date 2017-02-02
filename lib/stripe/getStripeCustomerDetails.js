/**
* Get Stripe customer data from the Stripe customer id.
* @todo Is the stripeID a number or a string? Docuement this.
* @returns {Object} Stripe customer object, with details about this Stripe customer (payment, etc.)
*/

import dotenv from 'dotenv'
dotenv.config()

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

function getStripeCustomerDetails (stripeID) {
  return new Promise(function (resolve, reject) {
    stripe.customers.retrieve(stripeID, function (err, customer) {
      if (err) {
        reject(err)
        return err
      }
      resolve(customer)
      return customer
    })
  })
}

export default getStripeCustomerDetails
