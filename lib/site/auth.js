/**
* Setup /auth route which handles the OAuth redirect, signs user in or creates new account, and issues JWT. After sign in, redirects to /account.
* @todo Handle errors.
* @todo We have an issue with not having access to users real name on sign up (sign in is fine).
*/

/* *******************************************
    AUTH: CREATE NEW ACCOUNT OR SIGN IN
*********************************************/
// Handle OAuth redirect: grab the code that is returned when user approves Yay app, and exchange it with Slack API for real access tokens. Then save those tokens and all the account info to Firebase.
import _prepareJWTForBrowser from '../auth/_prepareJWTForBrowser'
import findSetupConversationRoom from '../slackApp/findSetupConversationRoom'
import saveNewSlackAccountOrSignIn from '../account/saveNewSlackAccountOrSignIn'
import exchangeSlackCodeForToken from '../account/exchangeSlackCodeForToken'
import bodyParser from 'body-parser'
import co from 'co'
import db from '../account/database'

function setupAuthRoute (server) {
  server.use(bodyParser.urlencoded({ extended: false }))
  server.get('/auth', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
    res.header('Access-Control-Allow-Methods', 'Post, Get, Options')
    if (req.query.error) {
      // TODO: Handle error. Sentry system.
      res.send(req.query.error)
      return
    }
    co(function * () {
      // Exchange the code for a token
      let result = yield exchangeSlackCodeForToken(req.query.code)
      // Save the new token to Firebase, or sign the user in if already exists
      let nextResult = yield saveNewSlackAccountOrSignIn(result.data, db)
      // IMPORTANT TODO: The name name is not passed to us when we're setting up for first time (due to Slack permissions). You need to specifically sign in (not add to slack) to get user's identity back. How do we handle getting it when they first sign up? Make an extra request here?
      const userRealName = result.data.user ? result.data.user.name : 'FIX THIS NAME'
      // User is confirmed with Slack! Send them to account page and give them a JWT in cookie (or localStorage)
      let nextNextResult = _prepareJWTForBrowser(nextResult, userRealName)
      // Send the JWT to browser. This contains everything needed to authenticate user, and includes the team_id and user_id so we don't have to go look it up.
      res.cookie('access_token', nextNextResult, { domain: '.hintsy.io', maxAge: 86400000, secure: true })
      // Redirect to account page. May want to suffix with team id: `+ nextResult.team_id || nextResult.team.id`
      res.redirect('https://yay.hintsy.io/account/')
      // If this is a new account, proceed with bot setup
      if (nextResult.new_account) {
        findSetupConversationRoom(nextResult.user_id, nextResult.bot.bot_access_token)
      }
    }).catch(function (err) {
      // Route user to error page
      console.log(err)
    })
  })
}

export default setupAuthRoute
