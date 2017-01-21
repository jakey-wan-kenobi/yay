/**
* The core functionality of the app. This handles the interactions with the Slack user in selecting and purchasing a prize.
*/

import sendPurchaseEmails from '../email/sendPurchaseEmails'
import purchaseThisPrize from '../slackApp/purchaseThisPrize'
import getUserNameFromHandle from '../account/getUserNameFromHandle'
import returnNewPrize from '../slackApp/returnNewPrize'
import sendIntroToTeam from '../slackApp/sendIntroToTeam'
import getIntroMessage from '../slackApp/getIntroMessage'
import getCelebrationMessage from '../slackApp/getCelebrationMessage'
import checkHasSlackOrigin from '../auth/checkHasSlackOrigin'
import db from '../account/database'

function setupYayMessageButtons (server) {
  server.post('/yay-message-buttons', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
    res.header('Access-Control-Allow-Methods', 'Post, Get, Options')

    // NOTE: From Slack docs: "Though presented as an array, at this time you'll only receive a single action per incoming invocation."
    const data = JSON.parse(req.body.payload)

    // Ensure that this message button request is actually coming from Slack.
    const slackOrigin = checkHasSlackOrigin(data.token)
    if (!slackOrigin) return false

    switch (data.actions[0].name) {
      case 'did_choose_prize':
        // Pass the "callback_id" key which contains the appropriate product SKU, plus the "team_id", to our global purchase method.
        purchaseThisPrize(data.callback_id, data.team.id, data.user, db).then(function (val) {
          const successMessage = getCelebrationMessage()
          res.send(successMessage)
          // TODO: Place the order in a message queue that will send email to purchaser (receipt) and to recipient (request for address)
          // Send email to purchaser
          sendPurchaseEmails(val, db)
          // TODO: Ask if user would like us to alert the channel that this purchase has been made. Like a cool hint. Don't worry, we'll play it cool.
        }).catch(function (err) {
          // Handle missing credit card error
          if (err === 'missing_credit_card') {
            res.send('Oops, there\'s no payment info on your account. Go to https://yay.hintsy.io/account to add one!')
            return
          }
          // TODO: We're going to get the shipping address after the fact. So we need to put a fake address in here as a placeholder so we can still charge for the order. The user should NEVER see this error actually.
          if (err.param === 'shipping') {
            res.send('Noooo! You need to add a shipping address to your account before you can place orders: https://yay.hintsy.io/account.')
            return
          }
          // Handle sold out error. This should never happen, but just in case it does, we'll handle it.
          if (err.code === 'out_of_inventory') {
            res.send('Noooo! I literally just sold out of that product. That never happens, I swear. This is awkward. Try something else?')
            return
          }
          // Handle generic error
          console.log(err)
          res.send('Sorry, there was a problem placing your order! Please try again, and contact support if it still doesn\'t work: help@hintsygifts.com.')
        })
        return
      case 'choose_next_prize':
        // Get a new gift using our global method.
        let handle = getUserNameFromHandle(data.callback_id)
        returnNewPrize(data.actions[0].value, handle).then(function (val) {
          res.send(val)
        }).catch(function (err) {
          // TODO: Handle error
          console.log(err)
        })
        return
      case 'cancel':
        res.send('Okay, we\'ll figure it out later. 😘 ')
        return
      case 'yes_intro':
        // Send intro message to team in #general channel
        sendIntroToTeam(data)
        // Update the original message to the individual user to remove the intro message buttons
        const response = getIntroMessage(undefined, undefined, true)
        res.send(response)
        return
      case 'no_intro':
        // Update the original message to remove the intro buttons
        const responseTwo = getIntroMessage(undefined, undefined, false)
        res.send(responseTwo)
        return
      case 'yes_drop_hint':
        const responseThree = getCelebrationMessage(true)
        res.send(responseThree)
        return
      case 'no_drop_hint':
        const responseFour = getCelebrationMessage(false)
        res.send(responseFour)
        return
    }
  })
}

export default setupYayMessageButtons
