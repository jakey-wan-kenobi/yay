/**
* Save payment info to an existing Stripe customer, or else create a new Stripe customer with the payment info.
* @returns {Object} The Stripe customer data object (of the newly created, or the existing customer whose payment source we just updated).
*/

import dotenv from 'dotenv'
dotenv.config()

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

import captureException from '../core/captureException'
const heap = require('heap-api')(process.env.HEAP_CLIENT_ID)

function updateOrCreateStripeCustomer (stripeCheck, card, auth, db) {
  return new Promise(function (resolve, reject) {
    // If team already has a stripe_id, add this card via Stripe API, then pass customer when we're done.
    async function _runCheck () {
      if (stripeCheck.has_stripe_id === 'yes') {
        const customer = await _saveToExistingStripeCustomer(stripeCheck, card, auth)
        resolve(customer)
        return
      }
      // If team does not already have a stripe_id, create this customer via Stripe API. Then pass customer when we're done.
      if (stripeCheck.has_stripe_id === 'no') {
        const customer = await _createNewStripeCustomer(card, auth, db)
        resolve(customer)
        return
      }
    }
    _runCheck().catch(function (err) {
      captureException(err, 'Errur running async function to updateOrCreateStripeCustomer.', 242341)
    })
  })
}

// Update an existing Stripe customer with the credit card they've just added.
function _saveToExistingStripeCustomer (stripeCheck, card, auth) {
  return new Promise(function (resolve, reject) {
    stripe.customers.update(stripeCheck.stripe_id, {
      // Note: The following two keys are conditional, because we use this route to handle both credit card and address.
      source: card ? card.id : undefined
    }, function (err, customer) {
      // TODO: Handle error
      if (err) {
        reject(err)
        captureException(err, 'Error updating Stripe customer with card.', 436170)
        return
      }
      resolve(customer)
      // Track Heap event
      const heapUserID = auth.user_id + '+' + auth.team_id
      heap.track('Saved Credit Card', heapUserID, {
        slack_team_id: auth.team_id,
        user_id: auth.user_id
      })
      heap.addUserProperties(heapUserID, {
        user_name: auth.user_name,
        slack_team_id: auth.team_id,
        slack_user_name: auth.user_name
      })
      return
    })
  })
}

// Create a new Stripe customer and save to Firebase, under that user's team_id/user_id, then reject or resolve with customer data or error when we're done.
function _createNewStripeCustomer (card, auth, db) {
  return new Promise(function (resolve, reject) {
    stripe.customers.create({
      description: 'Slack team ' + auth.team_id + ', User ' + auth.user_id,
      metadata: {
        user_id: auth.user_id,
        team_id: auth.team_id
      },
      // Note: The following two keys WERE conditional, because we use this route to handle both credit card and address.
      source: card ? card.id : undefined // Token obtained with Stripe.js
    }, function (err, customer) {
      // Asynchronously called
      if (err) {
        reject(err)
        captureException(err, 'Error creating new Stripe customer.', 923580)
        return
      }
      let account = db.ref('/slack_accounts_users/' + auth.team_id + '/' + auth.user_id)
      account.update({
        stripe_id: customer.id
      }).then(function () {
        resolve(customer)
        // Track Heap event
        const heapUserID = auth.user_id + '+' + auth.team_id
        heap.track('Created Stripe Account', heapUserID, {
          slack_team_id: auth.team_id,
          user_id: auth.user_id
        })
        heap.addUserProperties(heapUserID, {
          user_name: auth.user_name,
          slack_team_id: auth.team_id,
          slack_user_name: auth.user_name
        })
        return
      }).catch(function (err) {
        reject(err)
        captureException(err, 'Error updating database with Stripe customer.', 111234)
        return
      })
    })
  })
}

export default updateOrCreateStripeCustomer
