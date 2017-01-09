/**
* Creates a new Stripe account and saves that account to the database, or just signs a user in if an account already exists.
* @todo Handle errors. Remove console logs.
* @param {Object} body The data object recieved from the Slack OAuth flow.
* @returns {Object} A promise. Either an error, the new account (with a child property specificying that it's a new account), or the existing account (with a child property specific it's an existing account).
*/

function saveNewSlackAccountOrSignIn (body, db) {
  let response = new Promise(function (resolve, reject) {
    // If we have an error, stop
    if (body.ok !== true) {
      // TODO: Error ocurred here. Sentry and handle.
      console.log('error a:', body)
      return
    }
    let accounts = db.ref('/slack_accounts')
    // Check whether team already exists in our Firebase
    accounts.once('value').then(function (snapshot) {
      // Decide what to do, depending on whether we're using "Sign in With Slack" or "Add to Slack". NOTE Team ID is different from body.team_id that is returned when user has clicked the Add to Slack button rather than the Sign in with Slack button)
      let teamID = body.team_id || body.team.id
      if (snapshot.child(teamID).exists()) {
        // TODO: This team already exists, and they are CONFIRMED authed at this point (RIGHT?). At this point, we can use the body.team.id to grab their info stored in Firebase
        let account = snapshot.child(teamID).val()
        account.new_account = false
        // Resolve the promise here, passing the team Firebase data in as the value
        resolve(account)
        return false
      }
      // Save the new team and data to Firebase (as it doens't already exist)
      accounts.child(teamID).set(body, function () {
        // Indicate that this is a new_account for control flow
        body.new_account = true
        // Resolve the promise
        resolve(body)
      })
    }).catch(function (error) {
      console.log(error)
      // Handle promise error and reject
      reject(error)
    })
  })
  return response
}

export default saveNewSlackAccountOrSignIn
