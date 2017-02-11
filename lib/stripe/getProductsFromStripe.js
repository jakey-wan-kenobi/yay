/**
* Retrieve products from Stripe Relay, returning a promise.
* @todo We can just retrieve one product at a time in the future if we want to. Then check that one for availability, and get the next one if not available. This would replace the way we recursively do it now.
*/

import captureException from '../core/captureException'
import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

function getProductsFromStripe () {
  return new Promise(function (resolve, reject) {
    stripe.products.list({
      limit: 100
    }, function (err, products) {
      if (err) {
        reject(err)
        captureException(err, 'Error getting products from Stripe.', 102040)
      }
      resolve(products.data)
      return
    })
  })
}

export default getProductsFromStripe
