/**
* The core functionality of the app. This handles the interactions with the Slack user in selecting and purchasing a prize.
*/

import sendPurchaseEmails from '../email/sendPurchaseEmails'
import purchaseThisPrize from '../slackApp/purchaseThisPrize'
import getUserHandleFromString from '../account/getUserHandleFromString'
import returnNewPrize from '../slackApp/returnNewPrize'
import sendIntroToTeam from '../slackApp/sendIntroToTeam'
import getIntroMessage from '../slackApp/getIntroMessage'
import getCelebrationMessage from '../slackApp/getCelebrationMessage'
import checkHasSlackOrigin from '../auth/checkHasSlackOrigin'
import dropHintInChannel from '../slackApp/dropHintInChannel'
import db from '../account/database'
import raven from 'raven'
import captureException from '../core/captureException'
const heap = require('heap-api')(process.env.HEAP_CLIENT_ID)

function setupYayMessageButtons (server) {
  server.post('/yay-message-buttons', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
    res.header('Access-Control-Allow-Methods', 'Post, Get, Options')

    // NOTE: From Slack docs: "Though presented as an array, at this time you'll only receive a single action per incoming invocation."
    const data = JSON.parse(req.body.payload)

    // Ensure that this message button request is actually coming from Slack.
    const slackOrigin = checkHasSlackOrigin(data.token)
    if (!slackOrigin) {
      raven.captureMessage('Message button recieved that did NOT come from Slack. Failed checkHasSlackOrigin method.')
      return false
    }

    // Track Heap user
    const heapUserID = data.user.id + '+' + data.team.id
    heap.addUserProperties(heapUserID, {
      slack_user_id: data.user.id,
      slack_team_id: data.team.id,
      slack_team_domain: data.team.domain,
      slack_user_name: data.user.name
    })

    switch (data.actions[0].name) {
      case 'did_choose_prize':
        // Pass the "callback_id" key which contains the appropriate product SKU, plus the "team_id", to our global purchase method.
        purchaseThisPrize(data.callback_id, data.team.id, data.user, db).then(function (val) {
          const successMessage = getCelebrationMessage()
          res.send(successMessage)
          // Send emails to recipient and purchaser
          sendPurchaseEmails(val, db)
        }).catch(function (err) {
          // Handle missing credit card error
          if (err === 'missing_credit_card') {
            res.send('Oops, there\'s no payment info on your account. Go to https://yay.hintsy.io/account to add one!')
            // Track Heap event
            heap.track('Purchase Attempted', heapUserID, {
              error: 'missing_credit_card',
              channel_name: data.channel.name,
              channel_id: data.channel.id
            })
            return
          }
          // TODO: We're going to get the shipping address after the fact. So we need to put a fake address in here as a placeholder so we can still charge for the order. The user should NEVER see this error actually.
          if (err.param === 'shipping') {
            res.send('Noooo! You need to add a shipping address to your account before you can place orders: https://yay.hintsy.io/account.')
            captureException(err, 'User attempted purchase without a shipping address.', 345844)
            return
          }
          // Handle sold out error. This should happen rarely (because we don't serve up 0 inventory products), but it will happen when timing is bad.
          if (err.code === 'out_of_inventory') {
            res.send('This is awkward. I literally just sold out of that prize. This never happens, I swear. Try something else?')
            // Track Heap event
            heap.track('Purchase Attempted', heapUserID, {
              error: 'out_of_inventory',
              channel_name: data.channel.name,
              channel_id: data.channel.id
            })
            return
          }
          // Handle generic error
          res.send('Sorry, there was a problem placing your order! Please try again, and contact support if it still doesn\'t work: help@hintsygifts.com.')
          captureException(err, 'User attempted purchase and unknown error occurred.', 105821)
          return
        })
        return
      case 'choose_next_prize':
        // Get a new gift using our global method.
        let handle = getUserHandleFromString(data.callback_id)
        returnNewPrize(data.actions[0].value, handle).then(function (val) {
          res.send(val)
        }).catch(function (err) {
          // Error handler
          captureException(err, 'User attempted to choose another prize with message buttons.', 461690)
        })
        return
      case 'cancel':
        res.send('Okay, we\'ll figure it out later. 😘 ')
        // Track Heap event
        heap.track('Cancel Prize Selection', heapUserID, {
          channel_name: data.channel.name,
          channel_id: data.channel.id
        })
        return
      case 'yes_intro':
        // Send intro message to team in #general channel
        sendIntroToTeam(data)
        // Update the original message to the individual user to remove the intro message buttons
        const response = getIntroMessage(undefined, undefined, true)
        res.send(response)
        // Track Heap event
        heap.track('Intro Yay to Team', heapUserID, {
          channel_name: data.channel.name,
          channel_id: data.channel.id
        })
        return
      case 'no_intro':
        // Update the original message to remove the intro buttons
        const responseTwo = getIntroMessage(undefined, undefined, false)
        res.send(responseTwo)
        // Track Heap event
        heap.track('Decline Intro to Team', heapUserID, {
          channel_name: data.channel.name,
          channel_id: data.channel.id
        })
        return
      case 'yes_drop_hint':
        // Update the original message to remove the buttons, plus send a message into the channel.
        const responseThree = getCelebrationMessage(true)
        dropHintInChannel(data.channel.id, data.team.id, data.message_ts)
        res.send(responseThree)
        // Track Heap event
        heap.track('Drop Purchase Hint', heapUserID, {
          channel_name: data.channel.name,
          channel_id: data.channel.id
        })
        return
      case 'no_drop_hint':
        // Update the original message to remove buttons.
        const responseFour = getCelebrationMessage(false)
        res.send(responseFour)
        // Track Heap event
        heap.track('Decline Purchase Hint', heapUserID, {
          channel_name: data.channel.name,
          channel_id: data.channel.id
        })
        return
    }
  })
}

export default setupYayMessageButtons
