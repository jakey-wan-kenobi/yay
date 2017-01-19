/**
* Send out the purchase-related emails: one to the purchaser (a receipt) and another to the recipient (a request for address to complete order).
* @todo Finish the reciept email. Uncomment line that forces it sent to me as workaround. This could probably use some refactoring.
* @param {Object} order The Stripe order object.
* @param {Object} db The Firebase database.
*/

import axios from 'axios'
import qs from 'querystring'
import dot from 'dot'
import fs from 'fs'

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
      _sendReceiptEmail(val.data.user.real_name, val.data.user.profile.email)
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
          _sendAddressEmail(recipient.profile.real_name, recipient.profile.email, order.id)
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

  // Send the actual receipt email, using the name and email we retrieved from Slack TODO: Make this the real receipt email template
  function _sendReceiptEmail (name, email) {
    // Create the mailgun email object
    var emailObj = {
      from: 'Hintsy <no-reply@mail.hintsygifts.com>',
      to: name + ' <' + email + '>',
      subject: 'Your Yay Prize is Purchased!',
      html: 'Purchase was made!'
    }
    // Send the mailgun email object TODO: Actually send a link to request the user's email address
    mailgun.messages().send(emailObj, function (error, body) {
      if (body) {
        console.log('success')
      } else if (error) {
        console.log('receipt error:', error)
      }
    })
  }

  // Send the actual address email, using the name and email we retrieved from Slack
  function _sendAddressEmail (name, email, orderID) {
    fs.readFile('email-templates/yay-shipping-address.html', function (error, html) {
      // Catch error
      if (error) {
        // TODO: Handle error
        console.log(error)
        return
      }
      // Data object we're going to pass to the template compiler (to populate the email with)
      let emailData = {
        name: name,
        email: email,
        orderID: orderID
      }
      // Compile the email
      let templateFn = dot.template(html)
      let compiledTmp = templateFn(emailData)
      // Create the mailgun email object
      var emailObj = {
        from: 'Hintsy <no-reply@mail.hintsygifts.com>',
        // to: name + ' <' + email + '>',
        // TODO: Uncomment the above to send the actual recipient
        to: 'Jake Allen <jacobrobertallen@gmail.com>',
        subject: 'You get a prize! 🎉 🙌 🦄  Let us know where to ship it.',
        html: compiledTmp
      }
      // Send the mailgun email object
      mailgun.messages().send(emailObj, function (error, body) {
        if (body) {
          console.log('success')
        } else if (error) {
          console.log('Shipping address error:', error)
        }
      })
    })
  }
}

export default sendPurchaseEmails
