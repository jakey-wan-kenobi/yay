import co from 'co'
require('dotenv').config()
let stripe = require('stripe')(process.env.TEST_STRIPE_KEY)

// Decide whether to add new Stripe customer, or update an existing one
function updateOrCreateStripeCustomer (stripeCheck, card, auth, db) {
  return new Promise(function (resolve, reject) {
    // If team already has a stripe_id, add this card via Stripe API, then pass customer when we're done.
    co(function * () {
      if (stripeCheck.has_stripe_id === 'yes') {
        const customer = yield _saveToExistingStripeCustomer(stripeCheck, card, auth)
        // TODO TOGETHER: When this function is done, res.send the credit card data back to the view.
        resolve(customer)
        return customer
      }
      // If team does not already have a stripe_id, create this customer via Stripe API. Then pass customer when we're done.
      if (stripeCheck.has_stripe_id === 'no') {
        const customer = yield _createNewStripeCustomer(card, auth, db)
        resolve(customer)
        return customer
      }
    })
  })
}

// Update an existing Stripe customer with the credit card they've just added.
function _saveToExistingStripeCustomer (stripeCheck, card, auth) {
  // TODO TOGETHER: Make this return a promise so we can yield to it above
  return new Promise(function (resolve, reject) {
    // console.log(shipping, stripeCheck.stripe_id)
    stripe.customers.update(stripeCheck.stripe_id, {
      // Note: The following two keys are conditional, because we use this route to handle both credit card and address.
      source: card ? card.id : undefined
    }, function (err, customer) {
      // TODO: Handle error
      if (err) {
        console.log(err)
        reject(err)
        return err
      }
      resolve(customer)
      return customer
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
      // Note: The following two keys are conditional, because we use this route to handle both credit card and address.
      source: card ? card.id : undefined // Token obtained with Stripe.js
      // email: TODO: Store the primary user's email in the JWT so we can add it here for receipts etc.
    }, function (err, customer) {
      // Asynchronously called
      if (err) {
        console.log(err)
        reject(err)
        return err
      }
      // TODO: Save stripe ID to Firebase
      let account = db.ref('/slack_accounts_users/' + auth.team_id + '/' + auth.user_id)
      account.update({
        stripe_id: customer.id
      }).then(function () {
        resolve(customer)
        return customer
      }).catch(function (err) {
        // NOTE: Didn't test whether this works.
        reject(err)
        return err
      })
    })
  })
}

export default updateOrCreateStripeCustomer
