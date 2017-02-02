/**
* Send out the purchase-related emails: one to the purchaser (a receipt) and another to the recipient (a request for address to complete order).
* @todo Finish the reciept email. Uncomment line that forces it sent to me as workaround. This could probably use some refactoring.
* @todo Refactor this so it uses the getListOfUsersOnTeam and getSlackTokenFromTeamID methods rather than private methods.
* @param {Object} order The Stripe order object.
* @param {Object} db The Firebase database.
*/

import axios from 'axios'
import qs from 'querystring'
import sendAddressEmail from '../email/services/sendAddressEmail'
import sendReceiptEmail from '../email/services/sendReceiptEmail'

import dotenv from 'dotenv'
dotenv.config()

import connectToMailgun from 'mailgun-js'
const mailgun = connectToMailgun({apiKey: process.env.MAILGUN_KEY, domain: 'mail.hintsygifts.com'})

function sendPurchaseEmails (order, db) {
  let teamAccountToken = db.ref('/slack_accounts/' + order.metadata.team_id + '/access_token')
  teamAccountToken.once('value').then(function (snapshot) {
    let accessToken = snapshot.val()
    let purchaserID = order.metadata.purchaser_id
    let recipientHandle = order.metadata.recipient_handle
    // Get the purchaser's info (name and email address) from the Slack API using the team access_token, then send them the receipt email
    _getPurchaserData(purchaserID, accessToken).then(function (val) {
      // TODO: Uncommen the below to send the receipt email to the purchaser (don't want to keep sending them)
      sendReceiptEmail(val.data.user.real_name, val.data.user.profile.email, mailgun)
    }).catch(function (err) {
      console.log(err)
    })
    // Get a list of this team's users so we can match the user handle we have to their user handle, then send the recipient the request for address email
    _getRecipientData(accessToken).then(function (val) {
      let users = val.data.members
      // Iterate through the list to find the match between users' handles
      for (var i = 0; i < users.length; i++) {
        // NOTE: The data returned by Slack API doesn't include the '@' symbold for the 'name' field (which is what they call the user handle)
        if ('@' + users[i].name === recipientHandle) {
          let recipient = users[i]
          // Send the address email to our recipient. NOTE: Is order.id a side effect here? Because we didn't pass it to _getRecipientData?
          sendAddressEmail(recipient.profile.real_name, recipient.profile.email, order.id, mailgun)
        }
      }
    }).catch(function (err) {
      console.log(err)
    })
  })

  // PROMISE: Get the purchasing user's information so we can email them the receipt.
  function _getPurchaserData (userID, accessToken) {
    let response = axios.post('https://slack.com/api/users.info', qs.stringify({
      token: accessToken,
      user: userID
    })).catch(function (error) {
      // TODO: Handle error
      console.log(error)
    })
    return response
  }

  // PROMISE: Get recipient data (using their Slack handle)so we can email them the request for a shipping address.
  function _getRecipientData (accessToken) {
    let response = axios.post('https://slack.com/api/users.list', qs.stringify({
      token: accessToken
    })).catch(function (error) {
      // TODO: Handle error
      console.log(error)
    })
    return response
  }
}

export default sendPurchaseEmails
