/**
* Yay slash commands.
*/

import returnNewPrize from '../slackApp/returnNewPrize'
import bodyParser from 'body-parser'
import co from 'co'
import getUserNameFromHandle from '../account/getUserNameFromHandle'

function setupYaySlashCommands (server) {
  // Parse application/x-www-form-urlencoded
  server.use(bodyParser.urlencoded({ extended: false }))

  server.post('/yay', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
    res.header('Access-Control-Allow-Methods', 'Post, Get, Options')

    // Make sure it's the right user/team
    // if (req.body.token !== 'XH7s8DjEOHTBEyO6tOGKZx9Y') {
    //   return false
    // }

    let data = req.body
    // Handle 'help' Slash command
    if (data.text.indexOf('help') > -1) {
      // TODO: Return help message
      res.send('*Weeeeee!* Here\'s all the cool tricks I can do: \n`/yay @user` To send an amazing prize to a teammate. \n`/yay account` To view your account usage & edit your payment or shipping details.  \n`/yay help` To...well, you already know what that does.')
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
    const recipientHandle = getUserNameFromHandle(data.text)

    if (typeof recipientHandle !== 'string') {
      // TODO: Handle this error better with a more sophisticated response
      res.send('Hm. I couldn\'t find that user. Make sure to use their @user Slack username!')
      return
    }

    co(function * () {
      // Use method to get a prize and return it to Slack.
      let getNewPrize = yield returnNewPrize(-1, recipientHandle)
      res.send(getNewPrize)
    }).catch(function (err) {
      // TODO: Handle error
      console.log(err)
    })
  })
}

export default setupYaySlashCommands
