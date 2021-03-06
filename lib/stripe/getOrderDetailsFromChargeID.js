/**
* Given a Stripe charge id, get the order object (so we can get things like the last 4 and brand of the card used).
* @param {String} chargeID The id of the charge in question.
* @returns {Object} The Stripe order object.
*/

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)
import captureException from '../core/captureException'

function getOrderDetailsFromChargeID (chargeID) {
  return new Promise(function (resolve, reject) {
    stripe.charges.retrieve(chargeID, function (err, charge) {
      if (err) {
        reject(err)
        captureException(err, 'Error retrieving order details from Stripe.', 315965)
        return
      }
      resolve(charge)
      return
    })
  })
}

export default getOrderDetailsFromChargeID
