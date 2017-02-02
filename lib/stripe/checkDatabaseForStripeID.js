/**
* Check if this specific user already has a stripe_id. Take the JWT auth data, determine whether this user already has a stripe_id, and then return that stripe_id along with a boolean indicating whether it has one.
* @param {Object} auth A decoded JWT.
* @param {Object} db The Firebase database.
* @returns {Object} A promise which resolves to an object which contains the user's Stripe id, along with a 'has_stripe_id' child property which is 'yes' or 'no'.
*/

function checkDatabaseForStripeID (auth, db) {
  let stripeDataCheck = {}
  let response = new Promise(function (resolve, reject) {
    // Check whether a stripe_id already exists for this user
    let accounts = db.ref('/slack_accounts_users/' + auth.team_id + '/' + auth.user_id)
    // Check whether user already has a stripe_id in our Firebase
    accounts.once('value').then(function (snapshot) {
      let user = snapshot.val()
      // If we don't have a user, we already know there's no stripe_id, resolve now
      if (!user) {
        stripeDataCheck.has_stripe_id = 'no'
        resolve(stripeDataCheck)
        return stripeDataCheck
      }
      // If the user exists at this node in DB, check whether it has a stripe_id already and return appropriately
      switch (typeof user.stripe_id === 'string') {
        case true:
          stripeDataCheck.has_stripe_id = 'yes'
          stripeDataCheck.stripe_id = user.stripe_id
          break
        case undefined:
          stripeDataCheck.has_stripe_id = 'no'
          break
        case false:
          stripeDataCheck.has_stripe_id = 'no'
          break
      }
      resolve(stripeDataCheck)
      return stripeDataCheck
    }, function (error) {
      // TODO: Make sure this actually catches the error -- artificially input a bad value into 'accounts' to test
      reject(error)
    })
  })
  return response
}

export default checkDatabaseForStripeID
