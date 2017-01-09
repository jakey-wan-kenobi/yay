/**
* The core functionality of the app. This handles the interactions with the Slack user in selecting and purchasing a prize.
*/

import sendPurchaseEmails from '../email/sendPurchaseEmails'
import purchaseThisPrize from '../slackApp/purchaseThisPrize'
import getUserNameFromHandle from '../account/getUserNameFromHandle'
import returnNewPrize from '../slackApp/returnNewPrize'
import db from '../account/database'

function setupYayMessageButtons (server) {
  server.post('/yay-message-buttons', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
    res.header('Access-Control-Allow-Methods', 'Post, Get, Options')

    // Make sure the request is coming from Slack TODO: make env variable
    // if (req.body.token !== 'XH7s8DjEOHTBEyO6tOGKZx9Y') {
    //   return false
    // }
    let data = JSON.parse(req.body.payload)
    // NOTE: From Slack docs: "Though presented as an array, at this time you'll only receive a single action per incoming invocation."
    if (data.actions[0].name === 'did_choose_prize') {
      // Pass the "callback_id" key which contains the appropriate product SKU, plus the "team_id", to our global purchase method.
      purchaseThisPrize(data.callback_id, data.team.id, data.user, db).then(function (val) {
        res.send('Great, we did it! You\'re prize will arrive soon!')
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
    } else if (data.actions[0].name === 'choose_next_prize') {
      // Get a new gift using our global method.
      let handle = getUserNameFromHandle(data.callback_id)
      // console.log(data.callback_id)
      returnNewPrize(data.actions[0].value, handle).then(function (val) {
        res.send(val)
      }).catch(function (err) {
        // TODO: Handle error
        console.log(err)
      })
    } else if (data.actions[0].name === 'cancel') {
      res.send('😘 Okay, we\'ll figure it out later.')
    }
    // res.send('yes')
  })
}

export default setupYayMessageButtons
