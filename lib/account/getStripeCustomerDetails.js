/* *******************************************
    METHOD: GET STRIPE CUSTOMER FROM STRIPE ID
*********************************************/
require('dotenv').config()
let stripe = require('stripe')(process.env.TEST_STRIPE_KEY)

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
