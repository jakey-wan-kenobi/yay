/**
* Yay slash commands.
*/

import returnNewPrize from '../slackApp/returnNewPrize'
import bodyParser from 'body-parser'
import getUserHandleFromString from '../account/getUserHandleFromString'
import checkHasSlackOrigin from '../auth/checkHasSlackOrigin'
import checkSlackFriendExists from '../slackApp/checkSlackFriendExists'

function setupYaySlashCommands (server) {
  // Parse application/x-www-form-urlencoded
  server.use(bodyParser.urlencoded({ extended: false }))

  server.post('/yay', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
    res.header('Access-Control-Allow-Methods', 'Post, Get, Options')

    // Ensure that this message button request is actually coming from Slack.
    const token = req.body.token
    const slackOrigin = checkHasSlackOrigin(token)
    if (!slackOrigin) return false

    const data = req.body
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
      return
    }

    // Handle 'account' Slash command
    if (data.text.indexOf('account') > -1) {
      // TODO: Return account link
      res.send('Go here to edit & view your account details: https://yay.hintsy.io/account/') // + data.team_id
      return
    }

    // Handle '@user' Slask command
    // Parse user handle from text sent over
    const recipientHandle = getUserHandleFromString(data.text)
    // Check that the handle is a string (and not empty). If we don't even have an '@somebody' string returned, we don't have a possible user handle.
    if (typeof recipientHandle !== 'string') {
      // TODO: Handle this error better with a more sophisticated response
      const message = {
        'text': 'Who dat? I can only send prizes to real Slack people, like *@stanley*.',
        'attachments': [{
          'fallback': 'Can\'t show image',
          'image_url': 'https://media.giphy.com/media/xT0BKmtQGLbumr5RCM/giphy.gif'
          // https://media.giphy.com/media/SDxzM5LAVq5Tq/giphy.gif
        }]
      }
      res.send(message)
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
      return
    }

    // Check that the possible user handle is an actual Slack user on this person's team. We don't want to allow accidental purchases to occur for people who don't exist.
    (async function () {
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
        return
      }
      if (realFriend === 'isBot') {
        res.send('That\'s very nice, but bots don\'t have shipping addresses (or corporeal bodies). Try a human.')
        return
      }
      // Now all checks have passed. Use method to get a prize and return it to Slack. NOTE: We're using -1 because we want to start at the beginning of the products array (I suppose we could start at 0, too).
      const getNewPrize = await returnNewPrize(-1, recipientHandle)
      res.send(getNewPrize)
    })().catch(function (err) {
      // TODO: Handle error
      console.log(err)
    })
  })
}

export default setupYaySlashCommands
