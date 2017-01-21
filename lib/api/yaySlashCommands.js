/**
* Yay slash commands.
*/

import returnNewPrize from '../slackApp/returnNewPrize'
import bodyParser from 'body-parser'
import getUserHandleFromString from '../account/getUserHandleFromString'
import checkHasSlackOrigin from '../auth/checkHasSlackOrigin'

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
    if (typeof recipientHandle !== 'string') {
      // TODO: Handle this error better with a more sophisticated response
      res.send('Hm. I couldn\'t find that user. Make sure to use their @user Slack username!')
      return
    }

    async function _runLogic () {
      // Use method to get a prize and return it to Slack. NOTE: We're using -1 because we want to start at the beginning of the products array (I suppose we could start at 0, too).
      let getNewPrize = await returnNewPrize(-1, recipientHandle)
      res.send(getNewPrize)
    }

    _runLogic().catch(function (err) {
      // TODO: Handle error
      console.log(err)
    })
  })
}

export default setupYaySlashCommands
