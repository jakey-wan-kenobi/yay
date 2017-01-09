import express from 'express'
import https from 'https'
import http from 'http'
import bodyParser from 'body-parser'
import co from 'co'
import _decodeJWT from './auth/_decodeJWT'
import lex from './core/lex'
import db from './account/database'

import dotenv from 'dotenv'
dotenv.config()

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

const app = express()

/* *******************************************
  SERVE YAY WEBSITE
*********************************************/
// NOTE: Strangeness here. Not sure why we have to serve each page and we can't use a *. Our 404 page won't actually get caught from the app, but from here. Strange.
app.use('/', express.static('../dist'))
app.use('/static', express.static(__dirname + '/../dist/static'))
// Orders Middleware: When orders page loads, check Stripe to see if this order id is already shipped, whether it's a real order id, etc. If so, they can't change the address.
app.use('/orders', function (req, res, next) {
  const orderID = req.query.order
  stripe.orders.retrieve(orderID, function (err, order) {
    if (err) {
      // Order id not in Stripe
      res.redirect('https://yay.hintsy.io/err/order_not_found')
    } else if (order.status !== ('created' || 'paid')) {
      // If order status is already fulfilled, canceled, etc.
      res.redirect('https://yay.hintsy.io/err/order_fulfilled')
    } else if (order.status === ('created' || 'paid')) {
      // Otherwise we're ready to serve the address page
      next()
    }
  })
})
app.use('/orders', express.static('../dist'))

/* NOTE: This auth flow is worth outlining. Here's how it works.
  1. Anytime a user navs to /account page, we check for their JWT (which is in the req.headers.cookie)
  2. If they have it, then we're good, and we know who they are. If they DON'T, we redirect them to the Sign in with Slack URL.
  3. Once they auth there, they're dropped back at /account with the new cookie (see /auth route below)
*/
// Account Middleware: If someone navigates to this page and we don't have a JWT for them OR we didn't just get one from Slack (in the URL), send them to auth at Slack
app.use('/account', function (req, res, next) {
  const cookie = req.headers.cookie
  let authJWT = cookie ? req.headers.cookie.replace('access_token=', '') : null
  let decodedJWT = _decodeJWT(authJWT)
  // If not authed, redirect to Slack for sign on
  if (!decodedJWT) {
    res.redirect('https://slack.com/oauth/authorize?scope=identity.basic&client_id=104436581472.112407214276')
    return
  }
  next()
})
app.use('/account', express.static('../dist'))

// Create website servers
http.createServer(lex.middleware(require('redirect-https')())).listen(80)
https.createServer(lex.httpsOptions, lex.middleware(app)).listen(443)

/* *******************************************
  API ENDPOINTS
*********************************************/

// Create API server
let api = express()
https.createServer(lex.httpsOptions, lex.middleware(api)).listen(3000)

/* *******************************************
    MIDDLEWARE TO CHECK AUTHENTICATION STATE WITH JWT
*********************************************/
// TODO: Turn this into our authentication middleware for user in browser (credit cards, address, etc.)
app.use(bodyParser.urlencoded({ extended: false }))

/* *******************************************
    AUTH: CREATE NEW ACCOUNT OR SIGN IN
*********************************************/
// Handle OAuth redirect: grab the code that is returned when user approves Yay app, and exchange it with Slack API for real access tokens. Then save those tokens and all the account info to Firebase.
import _prepareJWTForBrowser from './auth/_prepareJWTForBrowser'
import findSetupConversationRoom from './slackApp/findSetupConversationRoom'
import saveNewSlackAccountOrSignIn from './account/saveNewSlackAccountOrSignIn'
import exchangeSlackCodeForToken from './account/exchangeSlackCodeForToken'

app.get('/auth', function (req, res) {
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

// Setup API routes.
import setupYaySlashCommands from './api/yaySlashCommands'
setupYaySlashCommands(api)

import setupYayMessageButtons from './api/yayMessageButtons'
setupYayMessageButtons(api)

import setupSaveCreditCardRoute from './api/saveCreditCard'
setupSaveCreditCardRoute(api)

import setupAddShippingRoute from './api/addShippingAddress'
setupAddShippingRoute(api)

import setupCreditCardRoute from './api/creditCardDetails'
setupCreditCardRoute(api)

// Return our 404 page -- this is a catch all for everything that didn't get caught above. See the note on the strangeness.
app.use('/', function (req, res, next) {
  res.status(404).send('Page Not Found')
})
