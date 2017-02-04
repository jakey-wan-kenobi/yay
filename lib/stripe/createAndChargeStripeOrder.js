/**
* Creates a Stripe order and charges it to the customer's card.
* @param {String} callbackID The callback id from the message button (which we'll use to parse the product sku).
* @param {String} purchaser The user handle who's making the purchase.
* @param {String} teamID The Slack team id.
* @param {String} stripeID The Stripe id of the user we're charging.
* @param {Function} reject The reject method passed from the async function this will be nested in.
* @param {Function} resolve The resolve method passed from the async function this will be nested in.
* @returns {Object} The order object returned from Stripe.
*/

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

import getUserHandleFromString from '../account/getUserHandleFromString'

function createAndChargeStripeOrder (callbackID, purchaser, teamID, stripeID, reject, resolve) {
  // Place the order using the sku and stripe_id
  const sku = _parseSkuFromCallback(callbackID)
  const recipientHandle = getUserHandleFromString(callbackID)
  stripe.orders.create({
    currency: 'usd',
    customer: stripeID,
    metadata: {
      purchaser_id: purchaser.id,
      purchaser_name: purchaser.name,
      recipient_handle: recipientHandle,
      team_id: teamID
      // recipient_name: recipient.name,
      // recipient_id: recipient.id
    },
    items: [
      {
        type: 'sku',
        parent: sku
      }
    ],
    // NOTE: This is placeholder becuase it's required by stripe API. We're going to email the user to get this info directly, after the purchase.
    shipping: {
      name: 'Placeholder Name',
      address: {
        line1: 'Placeholder Street'
      }
    }
  }, function (err, order) {
    if (err) {
      reject(err)
      return err
    }
    // Stripe order created. Now pay for it.
    stripe.orders.pay(order.id, {
      // TODO: This field is required by Stripe. Does this need to actually be real?
      email: 'test@email.com'
    }, function (err, purchase) {
      if (err) {
        console.log(err)
        reject(err)
        return
      }
      resolve(purchase)
      return
    })
  })
}

// Parse the user name off the string, and then use THAT to parse off the SKU
function _parseSkuFromCallback (text) {
  const userName = getUserHandleFromString(text)
  // NOTE: We're replacing the @handle PLUS the space before it
  const sku = text.replace(' ' + userName, '')
  return sku
}

export default createAndChargeStripeOrder
