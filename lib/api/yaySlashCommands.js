/**
* Yay slash commands.
*/

import returnNewPrize from '../slackApp/returnNewPrize'
import bodyParser from 'body-parser'
import getUserHandleFromString from '../account/getUserHandleFromString'
import checkHasSlackOrigin from '../auth/checkHasSlackOrigin'
import checkSlackFriendExists from '../slackApp/checkSlackFriendExists'
import raven from 'raven'
import captureException from '../core/captureException'

const heap = require('heap-api')(process.env.HEAP_CLIENT_ID)

function setupYaySlashCommands (server) {
  // Parse application/x-www-form-urlencoded
  server.use(bodyParser.urlencoded({ extended: false }))

  server.post('/yay', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
    res.header('Access-Control-Allow-Methods', 'Post, Get, Options')

    // Using this to debug slash command timeouts. I can't really track them down, too elusive.
    // NOTES: I experienced a timeout when this DID log to console. So the problem happens further down the chain.
    console.time('slash_request')

    // Ensure that this message button request is actually coming from Slack.
    const token = req.body.token
    const slackOrigin = checkHasSlackOrigin(token)
    if (!slackOrigin) {
      raven.captureMessage('Slash command received that did NOT come from Slack. Failed checkHasSlackOrigin method.')
      return false
    }

    const data = req.body
    // Track Heap user
    const heapUserID = data.user_id + '+' + data.team_id
    // Handle 'help' Slash command
    if (data.text.indexOf('help') > -1) {
      const help = {
        'text': '*Weeeeee!* Yay is for having fun and sending prizes. You can use the `/yay` slash command to send cool prizes to your Slack friends. When you send them a prize, I\'ll email them to ask what address I should ship it to, and drop a fun hint in the channel (but only if you want me to). Their prize should only take a day or two to get there. It works in every channel, and it\'s only visible to you, so no spoilers 👻.',
        'attachments': [
          {
            'text': '_Here\'s all the cool tricks I can do:_ \n`/yay @user` To send a prize to a Slack friend. \n `/yay account` To edit your account & payment details.  \n `/yay help` To...well, you already know what that does.',
            'color': '#59FFBA',
            'mrkdwn_in': [
              'text'
            ]
          }
        ]
      }
      res.send(help)
      // Track Heap event
      heap.track('Help Slash Command', heapUserID, {
        text: data.text,
        channel_name: data.channel_name,
        channel_id: data.channel_id
      })
      _trackUserProperties(data, heapUserID)
      return
    }

    // Handle 'account' Slash command
    if (data.text.indexOf('account') > -1) {
      // Return account link
      res.send('Go here to edit & view your account details: https://yay.hintsy.io/account/') // + data.team_id
      // Track Heap event
      heap.track('Account Slash Command', heapUserID, {
        text: data.text,
        channel_name: data.channel_name,
        channel_id: data.channel_id
      })
      _trackUserProperties(data, heapUserID)
      return
    }

    // Handle '@user' Slask command
    // Parse user handle from text sent over
    const recipientHandle = getUserHandleFromString(data.text)
    // Check that the handle is a string (and not empty). If we don't even have an '@somebody' string returned, we don't have a possible user handle.
    if (typeof recipientHandle !== 'string') {
      // Handle this error better with a more sophisticated response
      const message = {
        'text': 'Who dat? I can only send prizes to real Slack people, like *@stanley*.',
        'attachments': [{
          'fallback': 'Can\'t show image',
          'image_url': 'https://media.giphy.com/media/xT0BKmtQGLbumr5RCM/giphy.gif'
          // https://media.giphy.com/media/SDxzM5LAVq5Tq/giphy.gif
        }]
      }
      res.send(message)
      // Track Heap event
      heap.track('Prize Slash Command', heapUserID, {
        error: 'Recipient not included',
        text: data.text,
        channel_name: data.channel_name,
        channel_id: data.channel_id
      })
      _trackUserProperties(data, heapUserID)
      return
    }

    // Check that the handle isn't @everyone, @channel, or @here
    if (recipientHandle === '@channel' || recipientHandle === '@here' || recipientHandle === '@everyone') {
      const message = {
        'text': 'You tryin\' to make it rain up in hurr? I\'m not _that_ magical. Just pick one friend, ya show off.',
        'attachments': [{
          'fallback': 'Can\'t show image.',
          'image_url': 'https://media.giphy.com/media/3osxYamKD88c6pXdfO/giphy.gif'
        }]
      }
      res.send(message)
      // Track Heap event
      heap.track('Prize Slash Command', heapUserID, {
        error: 'Recipient is everyone',
        text: data.text,
        channel_name: data.channel_name,
        channel_id: data.channel_id
      })
      _trackUserProperties(data, heapUserID)
      return
    }

    (async function () {
      // Check that the possible user handle is an actual Slack user on this person's team. We don't want to allow accidental purchases to occur for people who don't exist.
      console.time('check_slack_user_real')
      // Get the new prize concurrently with checking that the slack friend exists. That way, if it does exist, we're ready to send the prize right away. Await this promise later on.
      const getNewPrizePromise = returnNewPrize(-1, recipientHandle)
      const realFriend = await checkSlackFriendExists(recipientHandle, data.team_id)
      if (!realFriend) {
        const message = {
          'text': 'Is that your imaginary friend? I couldn\'t find *' + recipientHandle + '* on your team. Are you sure you typed it right?',
          'attachments': [{
            'fallback': 'Can\'t show image.',
            'image_url': ''
          }]
        }
        res.send(message)
        // Track Heap event
        heap.track('Prize Slash Command', heapUserID, {
          error: 'Recipient not real',
          text: data.text,
          channel_name: data.channel_name,
          channel_id: data.channel_id
        })
        _trackUserProperties(data, heapUserID)
        return
      }
      if (realFriend === 'isBot') {
        res.send('That\'s very nice, but bots don\'t have shipping addresses (or corporeal bodies). Try a human.')
        // Track Heap event
        heap.track('Prize Slash Command', heapUserID, {
          error: 'Recipient is bot',
          text: data.text,
          channel_name: data.channel_name,
          channel_id: data.channel_id
        })
        _trackUserProperties(data, heapUserID)
        return
      }
      // Now all checks have passed. Use method to get a prize and return it to Slack. NOTE: We're using -1 because we want to start at the beginning of the products array (and the method increments the index by 1 to move to the "next" product for the message buttons).
      console.timeEnd('check_slack_user_real')
      const getNewPrize = await getNewPrizePromise
      console.timeEnd('slash_request')
      res.send(getNewPrize)
      // Track Heap event & user properties
      heap.track('Prize Slash Command', heapUserID, {
        text: data.text,
        channel_name: data.channel_name,
        channel_id: data.channel_id
      })
      _trackUserProperties(data, heapUserID)
    })().catch(function (err) {
      // Error handler
      captureException(err, 'Error handling async function to return new prize via slash command.', 107385)
    })
  })
}

function _trackUserProperties (data, heapUserID) {
  heap.addUserProperties(heapUserID, {
    slack_user_id: data.user_id,
    slack_team_id: data.team_id,
    slack_team_domain: data.team_domain,
    slack_user_name: data.user_name
  })
}

export default setupYaySlashCommands
