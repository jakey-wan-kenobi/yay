/* *******************************************
    METHOD: GET STRIPE ID FROM SLACK ID
*********************************************/
// TODO: Handle when there are no stripe id in firebase for this user (they haven't added a card yet)
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
