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
import sendTexts from '../twilio/sendTexts'
import getUserHandleFromString from '../account/getUserHandleFromString'
import captureException from '../core/captureException'
const heap = require('heap-api')(process.env.HEAP_CLIENT_ID)

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
      captureException(err, 'Error creating Stripe order.', 327608)
      return
    }
    // Stripe order created. Now pay for it.
    stripe.orders.pay(order.id, {
      // NOTE: This field is required by Stripe. Does this need to actually be real?
      email: 'test@email.com'
    }, function (err, purchase) {
      if (err) {
        reject(err)
        captureException(err, 'Error charging Stripe order.', 156910)
        return
      }
      // Success. Purchase made and paid for.
      resolve(purchase)
      // Track Heap event
      const heapUserID = purchaser.id + '+' + teamID
      heap.track('Purchase', heapUserID, {
        sku: sku,
        recipient_handle: recipientHandle,
        stripe_id: stripeID
      })
      // Send text messages to admins
      const price = purchase.items[0].amount
      const product = purchase.items[0].description
      sendTexts(price, product)
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
