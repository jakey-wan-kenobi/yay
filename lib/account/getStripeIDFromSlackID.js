/**
* Get the customer's Stripe id, using their Slack id, from the database.
* @todo What types are the values I'm passing?
* @todo Handle when there is no Stripe id in Firebase for this user (they haven't added a card yet).
* @returns {Object} A promise. Resolves with the user's Stripe id.
*/

function getStripeIDFromSlackID (teamID, userID, db) {
  return new Promise(function (resolve, reject) {
    let stripeID = db.ref('/slack_accounts_users/' + teamID + '/' + userID + '/stripe_id')
    stripeID.once('value').then(function (snapshot) {
      resolve(snapshot.val())
      return snapshot.val()
    })
  })
}

export default getStripeIDFromSlackID
