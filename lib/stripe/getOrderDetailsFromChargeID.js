/**
* Given a Stripe charge id, get the order object (so we can get things like the last 4 and brand of the card used).
* @param {String} chargeID The id of the charge in question.
* @returns {Object} The Stripe order object.
*/

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

function getOrderDetailsFromChargeID (chargeID) {
  return new Promise(function (resolve, reject) {
    stripe.charges.retrieve('ch_19Rv8NBbi4MXdx9EBUYMrbjT', function (err, charge) {
      if (err) {
        // TODO: Handle error
        console.log(err)
        reject(err)
        return
      }
      resolve(charge)
      return
    })
  })
}

export default getOrderDetailsFromChargeID
