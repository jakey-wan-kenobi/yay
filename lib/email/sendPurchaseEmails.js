/**
* Send out the purchase-related emails: one to the purchaser (a receipt) and another to the recipient (a request for address to complete order).
* @todo Finish the reciept email. Uncomment line that forces it sent to me as workaround. This could probably use some refactoring.
* @todo Refactor this so it uses the getListOfUsersOnTeam and getSlackTokenFromTeamID methods rather than private methods.
* @param {Object} order The Stripe order object.
* @param {Object} db The Firebase database.
*/

import sendAddressEmail from '../email/services/sendAddressEmail'
import sendReceiptEmail from '../email/services/sendReceiptEmail'
import getSlackUserDataFromHandle from '../slackApp/getSlackUserDataFromHandle'
import getUserDataFromUserID from '../account/getUserDataFromUserID'
import getOrderDetailsFromChargeID from '../stripe/getOrderDetailsFromChargeID'
import captureException from '../core/captureException'

import dotenv from 'dotenv'
dotenv.config()

import connectToMailgun from 'mailgun-js'
const mailgun = connectToMailgun({apiKey: process.env.MAILGUN_KEY, domain: 'mail.hintsygifts.com'})

function sendPurchaseEmails (order, db) {
  let teamAccountToken = db.ref('/slack_accounts/' + order.metadata.team_id + '/access_token')
  teamAccountToken.once('value').then(function (snapshot) {
    const accessToken = snapshot.val()
    const purchaserID = order.metadata.purchaser_id
    const recipientHandle = order.metadata.recipient_handle;
    (async function () {
      // TODO: These two functions should run in parallel
      // Get the recipients data (using their handle), and then send them the address email
      const recipientData = await getSlackUserDataFromHandle(accessToken, recipientHandle)
      sendAddressEmail(recipientData.profile.real_name, recipientData.profile.email, order.id, mailgun)
      // Get the purchaser's data, plus Stripe charge info, and send them the receipt email
      const orderDetails = await getOrderDetailsFromChargeID(order.charge)
      const purchaserData = await getUserDataFromUserID(accessToken, purchaserID)
      sendReceiptEmail(purchaserData.data.user.real_name, purchaserData.data.user.profile.email, orderDetails.source.last4, orderDetails.source.brand, order, mailgun)
    })().catch(function (err) {
      // Error handler
      captureException(err, 'Error running async function to send purchase emails.', 254182)
    })
  })
}

export default sendPurchaseEmails
