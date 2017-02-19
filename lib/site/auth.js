/**
* Setup /auth route which handles the OAuth redirect, uses the code we're passed from Slack to get an access token from Slack API, signs user in or creates new account, and issues JWT. After sign in, redirects to /account.
* @todo Handle errors.
* @todo We have an issue with not having access to users real name on sign up (sign in is fine).
*/

import _prepareJWTForBrowser from '../auth/_prepareJWTForBrowser'
import findSetupConversationRoom from '../slackApp/findSetupConversationRoom'
import saveNewSlackAccountOrSignIn from '../account/saveNewSlackAccountOrSignIn'
import exchangeSlackCodeForToken from '../account/exchangeSlackCodeForToken'
import getUserDataFromUserID from '../account/getUserDataFromUserID'
import bodyParser from 'body-parser'
import db from '../account/database'
import captureException from '../core/captureException'
import addUserToEmailList from '../email/addUserToEmailList'

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
    (async function () {
      // Exchange the code for a token
      const result = await exchangeSlackCodeForToken(req.query.code)
      // Save the new token to Firebase, or sign the user in if already exists
      const nextResult = await saveNewSlackAccountOrSignIn(result.data, db)
      // NOTE: The user's name is not passed to us by Slack after installing the app (only after signing in). So we need to fetch it if it's in in the result data.
      let userRealName = result.data.user ? result.data.user.name : null
      // Fetch user's name
      if (!userRealName) {
        const fetchedUser = await getUserDataFromUserID(result.data.access_token, result.data.user_id)
        userRealName = fetchedUser.data.user.profile.real_name
        // If we fetchedUser data (because this is an install), then add this user to our mailing list.
        addUserToEmailList(fetchedUser.data.user.profile.email, userRealName, fetchedUser.data.user.team_id, fetchedUser.data.user.id)
      }
      // User is confirmed with Slack! Send them to account page and give them a JWT in cookie (or localStorage)
      const nextNextResult = _prepareJWTForBrowser(nextResult, userRealName)
      // Send the JWT to browser. This contains everything needed to authenticate user, and includes the team_id and user_id so we don't have to go look it up.
      res.cookie('access_token', nextNextResult, { domain: '.hintsy.io', maxAge: 86400000, secure: true })
      // Redirect to account page. May want to suffix with team id: `+ nextResult.team_id || nextResult.team.id`
      res.redirect('https://yay.hintsy.io/account/')
      // If this is a new account, proceed with bot setup
      if (nextResult.new_account) {
        findSetupConversationRoom(nextResult.user_id, nextResult.bot.bot_access_token)
      }
    })().catch(function (err) {
      captureException(err, 'Error running async function at /auth route.', 475370)
    })
  })
}

export default setupAuthRoute
