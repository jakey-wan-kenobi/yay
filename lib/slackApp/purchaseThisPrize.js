/**
* Purchase the prize selected by the Slack user. Returns a promise.
* @todo Handle errors. Missing credit card. Etc.
* @param {String} callback_id The callback_id from Slack message buttons. We've stuffed the recipient user's handle PLUS the product SKU into this value (we don't have many options). So we'll use this to split up both values and use them to process the order.
* @param {String} team_id The Slack team id of the user who made the purchase.
* @param {Object} purchaser An object that contains details about the purchasing user.
* @param {Object} db The Firebase database.
*/

import dotenv from 'dotenv'
dotenv.config()

import createAndChargeStripeOrder from '../stripe/createAndChargeStripeOrder'
import raven from 'raven'

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
            reject('missing_credit_card')
            raven.captureMessage('User attempted purchase with no credit card information.')
            return false
          } else {
            createAndChargeStripeOrder(callbackID, purchaser, teamID, stripeID, reject, resolve)
          }
        })
      } else {
        createAndChargeStripeOrder(callbackID, purchaser, teamID, stripeID, reject, resolve)
      }
    })
  })
}

export default purchaseThisPrize
