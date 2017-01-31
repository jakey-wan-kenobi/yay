/**
* Purchase the prize selected by the Slack user.
* @todo Handle errors. Missing credit card. Etc.
* @param {String} callback_id The callback_id from Slack message buttons. We've stuffed the recipient user's handle PLUS the product SKU into this value (we don't have many options). So we'll use this to split up both values and use them to process the order.
* @param {String} team_id The Slack team id of the user who made the purchase.
* @param {Object} purchaser An object that contains details about the purchasing user.
* @param {Object} db The Firebase database.
*/

import dotenv from 'dotenv'
dotenv.config()

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

import getUserHandleFromString from '../account/getUserHandleFromString'

function purchaseThisPrize (callbackID, teamID, purchaser, db) {
  // Return a promise that resolves with the new gift. This can be sent back to Slack via res.send(val)
  return new Promise(function (resolve, reject) {
    // Overview: Lookup a TEAM credit card in Firebase, using the "team_id". Then grab the "team_stripe_id" for the team, and if no "team_stripe_id", lookup the user's "stripe_id". Always lookup the team first, because this should be used whenever available (even if individual user has a card inputted).
    let teamAccount = db.ref('/slack_accounts/' + teamID + '/team_stripe_id')
    let stripeID = ''
    teamAccount.once('value').then(function (snapshot) {
      stripeID = snapshot.val()
      // If we don't have a team_stripe_id, lookup the individual user's "stripe_id"
      if (!stripeID) {
        // Lookup "stripe_id" from Firebase using "team_id" and "user_id", then pass to purchase function
        let userAccount = db.ref('/slack_accounts_users/' + teamID + '/' + purchaser.id)
        userAccount.once('value').then(function (snapshot2) {
          stripeID = snapshot2.child('stripe_id').val()
          // If there is STILL no stripe_id, then we reject, because neither the team nor the individual has a stripe_id.
          if (!stripeID) {
            // TODO: Handle no credit card
            // console.log('no credit card')
            reject('missing_credit_card')
            return false
          } else {
            _placeOrder(callbackID, purchaser, teamID, stripeID, reject, resolve)
          }
        })
      } else {
        _placeOrder(callbackID, purchaser, teamID, stripeID, reject, resolve)
      }
    })
  })
}

// Parse the user name off the string, and then use THAT to parse off the SKU
function _parseSkuFromCallback (text) {
  const userName = getUserHandleFromString(text)
  // NOTE: We're replacing the @handle PLUS the space before it
  const sku = text.replace(' ' + userName, '')
  // console.log(sku)
  return sku
}

// Place the actual order
function _placeOrder (callbackID, purchaser, teamID, stripeID, reject, resolve) {
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
    resolve(order)
    return order
  })
}

export default purchaseThisPrize
