let express = require('express')
let app = express()
let https = require('https')
let http = require('http')
let axios = require('axios')
let bodyParser = require('body-parser')
let jwt = require('jsonwebtoken')
let co = require('co')
// Adds env variables from process.env to "process.env" object
require('dotenv').config()
let stripe = require('stripe')(process.env.TEST_STRIPE_KEY)

/* *******************************************
  LETS-ENCRYPT SSL SETUP
*********************************************/

// Returns an instance of node-letsencrypt with additional helper methods
let lex = require('letsencrypt-express').create({
  server: 'https://acme-v01.api.letsencrypt.org/directory',
  challenges: { 'http-01': require('le-challenge-fs').create({ webrootPath: '/tmp/acme-challenges' }) },
  store: require('le-store-certbot').create({ webrootPath: '/tmp/acme-challenges' }),
  approveDomains: approveDomains
})

// This is where you check your database and associated email addresses with domains and agreements and such
function approveDomains (opts, certs, cb) {
  // The domains being approved for the first time are listed in opts.domains
  // Certs being renewed are listed in certs.altnames
  if (certs) {
    opts.domains = certs.altnames
  } else {
    opts.email = 'jake@hintsygifts.com'
    opts.agreeTos = true
  }

  // NOTE: you can also change other options such as `challengeType` and `challenge`
  // opts.challengeType = 'http-01';
  // opts.challenge = require('le-challenge-fs').create({});
  cb(null, { options: opts, certs: certs })
}

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

import db from './account/database'

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
// app.post('/check-auth', function (req, res) {
//   res.header('Access-Control-Allow-Origin', '*')
//   res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
//   res.header('Access-Control-Allow-Methods', 'Post, Get, Options')
//   // Other ways to check incoming token are: URL params: || req.query.token || POST params: req.headers['x-access-token']
//   let token = req.body.token
//   let decoded = jwt.verify(token, process.env.JWT_SECRET)
//   // NOTE: If this 'decoded' contains user info, they are authorized. All good to let them do secret things.
//   console.log(decoded)
// })

// Pass in the req.body.token and get back the decoded JWT
function _decodeJWT (token) {
  // jwt.verify() fails if you pass it null or undefined, so this is necessary
  if (!token) return false
  let decoded = jwt.verify(token, process.env.JWT_SECRET)
  return decoded
}

/* *******************************************
    AUTH: CREATE NEW ACCOUNT OR SIGN IN
*********************************************/
// Handle OAuth redirect: grab the code that is returned when user approves Yay app, and exchange it with Slack API for real access tokens. Then save those tokens and all the account info to Firebase.
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
    let result = yield _exchangeCodeForToken(req.query.code)
    // Save the new token to Firebase, or sign the user in if already exists
    let nextResult = yield _saveNewSlackAccountOrSignIn(result.data)
    // TODO: Pass user's name back to client to display on account page
    const userRealName = result.data.user.name
    // User is confirmed with Slack! Send them to account page and give them a JWT in cookie (or localStorage)
    let nextNextResult = _prepareJWTForBrowser(nextResult, userRealName)
    // Send the JWT to browser. This contains everything needed to authenticate user, and includes the team_id and user_id so we don't have to go look it up.
    res.cookie('access_token', nextNextResult, { domain: '.hintsy.io', maxAge: 86400000, secure: true })
    // Redirect to account page. May want to suffix with team id: `+ nextResult.team_id || nextResult.team.id`
    res.redirect('https://yay.hintsy.io/account/')
    // If this is a new account, proceed with bot setup
    if (nextResult.new_account) {
      _findSetupConversation(nextResult.user_id, nextResult.bot.bot_access_token)
    }
  }).catch(function (err) {
    // Route user to error page
    console.log(err)
  })
})

// Create a JWT for this user (this should only be done after confirming identity with Slack)
function _prepareJWTForBrowser (data, name) {
  let token = jwt.sign({
    user_id: data.user_id,
    team_id: data.team_id,
    user_name: name
  }, process.env.JWT_SECRET, { expiresIn: '24h' })
  return token
}

// PROMISE: Exchange the Slack code for an access token (see here: https://api.slack.com/methods/oauth.access)
function _exchangeCodeForToken (codeRecieved) {
  let response = axios.post('https://slack.com/api/oauth.access', qs.stringify({
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    code: codeRecieved
  })).catch(function (error) {
    // TODO: Handle error
    console.log(error)
  })
  return response
}

// PROMISE: Save the data received from Slack to Firebase OR just sign the user in
function _saveNewSlackAccountOrSignIn (body) {
  let response = new Promise(function (resolve, reject) {
    // If we have an error, stop
    if (body.ok !== true) {
      // TODO: Error ocurred here. Sentry and handle.
      console.log('error a:', body)
      return
    }
    let accounts = db.ref('/slack_accounts')
    // Check whether team already exists in our Firebase
    accounts.once('value').then(function (snapshot) {
      // Decide what to do, depending on whether we're using "Sign in With Slack" or "Add to Slack". NOTE Team ID is different from body.team_id that is returned when user has clicked the Add to Slack button rather than the Sign in with Slack button)
      let teamID = body.team_id || body.team.id
      if (snapshot.child(teamID).exists()) {
        // TODO: This team already exists, and they are CONFIRMED authed at this point (RIGHT?). At this point, we can use the body.team.id to grab their info stored in Firebase
        let account = snapshot.child(teamID).val()
        account.new_account = false
        // Resolve the promise here, passing the team Firebase data in as the value
        resolve(account)
        return false
      }
      // Save the new team and data to Firebase (as it doens't already exist)
      accounts.child(teamID).set(body, function () {
        // Indicate that this is a new_account for control flow
        body.new_account = true
        // Resolve the promise
        resolve(body)
      })
    }).catch(function (error) {
      console.log(error)
      // Handle promise error and reject
      reject(error)
    })
  })
  return response
}

// Find the direct message between the bot and the installing user
let qs = require('querystring')
function _findSetupConversation (userID, authToken) {
  // List channel ids that bot has access to
  axios.post('https://slack.com/api/im.list', qs.stringify({
    token: authToken
  })).then(function (response) {
    let ims = response.data.ims
    for (let i = 0; i < ims.length; i++) {
      if (ims[i].user === userID) {
        _sendFirstMessage(ims[i].id, authToken)
      }
    }
  }).catch(function (error) {
    // TODO Handle error
    console.log(error)
  })
}

// Send a message to the Slack user who installed the app so we can finish the setup. TODO: This isn't able to parse the array for some reason. It's using qs.stringify to format for urlencoded, which isn't working
function _sendFirstMessage (channelID, authToken) {
  axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    'token': authToken,
    'channel': channelID,
    'text': 'Hi! Lets set this shit up! https://yay.hintsy.io/account',
    'attachments': [{'pre-text': 'pre-hello', 'text': 'text-world'}]
  })).then(function (response) {
    // NOTE Do we need to do anything with this response?
  }).catch(function (error) {
    // TODO Handle error
    console.log(error)
  })
}

// This opens a websock connection for the bot, so she can listen on every channel she's invited to (and determine when to interact with people). Use like this: _startSlackBot(authToken)
// function _startSlackBot (authToken) {
//   let SlackBot = require('slackbots')
//   let bot = new SlackBot({
//     token: authToken
//   })
//   bot.on('start', function () {
//     console.log('hello world!')
//   })
//   bot.on('message', function (data) {
//     console.log(data)
//   })
// }

/* *******************************************
    YAY SLASH COMMAND
*********************************************/
// Parse application/x-www-form-urlencoded
api.use(bodyParser.urlencoded({ extended: false }))
import returnNewPrize from './slackApp/returnNewPrize'

api.post('/yay', function (req, res) {
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

/* *******************************************
    MESSAGE BUTTON HANDLER
*********************************************/
import sendPurchaseEmails from './email/sendPurchaseEmails'
import purchaseThisPrize from './slackApp/purchaseThisPrize'
import getUserNameFromHandle from './account/getUserNameFromHandle'

api.post('/yay-message-buttons', function (req, res) {
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

/* *******************************************
    SAVE CREDIT CARD TODO: Edit this so it only accounts for credit card (we're doing addresses per-order now)
*********************************************/
api.use(bodyParser.json())
api.route('/save-order-details')
  .all(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept, Bearer')
    next()
  })
  // This options route is required for the preflight done by the browser
  .options(function (req, res, next) {
    res.status(200).end()
    // next()
  })
  .post(function (req, res, next) {
    // TODO: Auth the request. This isn't the most optimal solution because it relies on getting the cookie/JWT in the format 'access_token=XYZ'
    let authJWT = req.headers.bearer.replace('access_token=', '')
    let creditCard = req.body.card ? req.body : null
    let shipping = req.body.line1 ? req.body : null
    // If no bearer token (JWT cookie) includedin request, send 403 and return
    if (!authJWT) {
      res.sendStatus(403)
      return
    }
    let decodedJWT = _decodeJWT(authJWT)
    // If not authed, send a 403 and return
    if (!decodedJWT) {
      res.send(403)
      return
    }
    // Check whether stripe_id exists for this user, and then decide how to process data recieved (may be credit card token from Stripe, or shipping address data)
    co(function * () {
      let stripeIDCheck = yield _checkForStripeID(decodedJWT)
      let customer = yield _processDataConditionally(stripeIDCheck, creditCard, decodedJWT, shipping)
      let card = _getCardFromStripeData(customer)
      // Send the credit card data back to client (for success/fail message) TODO: What happens if we failed?
      res.send(card)
    })
  })

// Decide whether to add new Stripe customer, or update an existing one
function _processDataConditionally (stripeCheck, card, auth, shipping) {
  return new Promise(function (resolve, reject) {
    // If team already has a stripe_id, add this card via Stripe API, then pass customer when we're done.
    co(function * () {
      if (stripeCheck.has_stripe_id === 'yes') {
        const customer = yield _saveToExistingStripeCustomer(stripeCheck, card, auth, shipping)
        // TODO TOGETHER: When this function is done, res.send the credit card data back to the view.
        resolve(customer)
        return customer
      }
      // If team does not already have a stripe_id, create this customer via Stripe API. Then pass customer when we're done.
      if (stripeCheck.has_stripe_id === 'no') {
        const customer = yield _createNewStripeCustomer(card, auth, shipping)
        resolve(customer)
        return customer
      }
    })
  })
}

// Create a new Stripe customer and save to Firebase, under that user's team_id/user_id, then reject or resolve with customer data or error when we're done.
function _createNewStripeCustomer (card, auth, shipping) {
  return new Promise(function (resolve, reject) {
    stripe.customers.create({
      description: 'Slack team ' + auth.team_id + ', User ' + auth.user_id,
      metadata: {
        user_id: auth.user_id,
        team_id: auth.team_id
      },
      // Note: The following two keys are conditional, because we use this route to handle both credit card and address.
      source: card ? card.id : undefined, // Token obtained with Stripe.js
      shipping: shipping ? {
        address: shipping,
        name: 'Team' // TODO: I'm hacking this in as a default just becuase Stripe requires it to save address
      } : undefined
      // email: TODO: Store the primary user's email in the JWT so we can add it here for receipts etc.
    }, function (err, customer) {
      // Asynchronously called
      if (err) {
        console.log(err)
        reject(err)
        return err
      }
      // TODO: Save stripe ID to Firebase
      let account = db.ref('/slack_accounts_users/' + auth.team_id + '/' + auth.user_id)
      account.update({
        stripe_id: customer.id
      }).then(function () {
        resolve(customer)
        return customer
      }).catch(function (err) {
        // NOTE: Didn't test whether this works.
        reject(err)
        return err
      })
    })
  })
}

// Update an existing Stripe customer with the credit card they've just added.
function _saveToExistingStripeCustomer (stripeCheck, card, auth, shipping) {
  // TODO TOGETHER: Make this return a promise so we can yield to it above
  return new Promise(function (resolve, reject) {
    // console.log(shipping, stripeCheck.stripe_id)
    stripe.customers.update(stripeCheck.stripe_id, {
      // Note: The following two keys are conditional, because we use this route to handle both credit card and address.
      source: card ? card.id : undefined,
      shipping: shipping ? {
        address: shipping,
        name: 'Team' // TODO: I'm hacking this in as a default just becuase Stripe requires it to save address
      } : undefined
    }, function (err, customer) {
      // TODO: Handle error
      if (err) {
        console.log(err)
        reject(err)
        return err
      }
      resolve(customer)
      return customer
    })
  })
}

// Check if this specific user already has a stripe_id. Take the JWT auth data, determine whether this user already has a stripe_id, and then return that stripe_id along with a boolean indicating whether it has one.
function _checkForStripeID (auth) {
  let stripeDataCheck = {}
  let response = new Promise(function (resolve, reject) {
    // Check whether a stripe_id already exists for this user
    let accounts = db.ref('/slack_accounts_users/' + auth.team_id + '/' + auth.user_id)
    // Check whether user already has a stripe_id in our Firebase
    accounts.once('value').then(function (snapshot) {
      let user = snapshot.val()
      // If we don't have a user, we already know there's no stripe_id, resolve now
      if (!user) {
        stripeDataCheck.has_stripe_id = 'no'
        resolve(stripeDataCheck)
        return stripeDataCheck
      }
      // If the user exists at this node in DB, check whether it has a stripe_id already and return appropriately
      switch (typeof user.stripe_id === 'string') {
        case true:
          stripeDataCheck.has_stripe_id = 'yes'
          stripeDataCheck.stripe_id = user.stripe_id
          break
        case undefined:
          stripeDataCheck.has_stripe_id = 'no'
          break
        case false:
          stripeDataCheck.has_stripe_id = 'no'
          break
      }
      resolve(stripeDataCheck)
      return stripeDataCheck
    }, function (error) {
      // TODO: Make sure this actually catches the error -- artificially input a bad value into 'accounts' to test
      reject(error)
    })
  })
  return response
}

/* *******************************************
    ADD SHIPPING ADDRESS TO STRIPE ORDER
*********************************************/
api.use(bodyParser.urlencoded({ extended: false }))
api.route('/add-shipping-address')
  .all(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', 'https://yay.hintsy.io')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept, Bearer')
    next()
  })
  // This options route is required for the preflight done by the browser
  .options(function (req, res, next) {
    res.status(200).end()
    // next()
  })
  .post(function (req, res, next) {
    const address = req.body
    const orderID = req.query.order
    // Add the address to this orderID in Stripe
    stripe.orders.update(orderID, {
      metadata: {
        address_line1: address.line1,
        address_line2: address.line2,
        address_city: address.city,
        address_postal_code: address.postal_code,
        address_state: address.state
      }
    }, function (err, data) {
      console.log(err, data)
      if (err) {
        // TODO: Handle this error. Something went wrong, tell the user.
        res.status(500).send(err)
        return
      }
      // Send success response to client.
      res.send(200)
    })
  })

/* *******************************************
    RETRIEVE PREVIOUSLY SAVED CREDIT CARD DETAILS
*********************************************/
import getStripeIDFromSlackID from './account/getStripeIDFromSlackID'
api.route('/credit-card-details')
  .all(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept, Bearer')
    next()
  })
  // This options route is required for the preflight done by the browser
  .options(function (req, res, next) {
    res.status(200).end()
    // next()
  })
  .post(function (req, res, next) {
    // Decode JWT. Remember, we'll always have one of these, because we've already checked auth and redirected them if they aren't signed in (via /account route).
    console.log('cookie', req.headers.bearer.replace('access_token=', ''))
    const authJWT = req.headers.bearer.replace('access_token=', '')
    const decodedJWT = _decodeJWT(authJWT)
    co(function * () {
      // Get user's stripe ID
      const stripeID = yield getStripeIDFromSlackID(decodedJWT.team_id, decodedJWT.user_id, db)
      // Handle if user doesn't have a Stripe ID yet (because they haven't previously added a card). Just close the request with a response and end.
      if (!stripeID) {
        res.sendStatus(200)
        return
      }
      // Get user's credit card info using stripe ID
      const customerData = yield _getStripeCustomerDetails(stripeID)
      // NOTE: Do we really need this? Handle if customer doesn't have any credit cards yet (but for some reason has a Stripe ID). Weird but possible I guess.
      if (!customerData.sources) {
        res.sendStatus(200)
        return
      }
      const card = _getCardFromStripeData(customerData)
      res.send(card)
    })
  })

/* *******************************************
    METHOD: GET PAYMENT INFO FROM STRIPE CUSTOMER DATA
*********************************************/
function _getCardFromStripeData (stripeData) {
  const cardList = stripeData.sources.data
  let dataToSend = null
  for (let i = 0; i < cardList.length; i++) {
    // Since there may be multiple sources, we need to grab the default source from the array of possible sources (stripe always returns an array of sources).
    if (cardList[i].id === stripeData.default_source) {
      const card = cardList[i]
      // Cherry pick what data we want to return (we don't want all of it)
      dataToSend = {
        last4: card.last4,
        brand: card.brand
      }
      // Send this back to the client
      return dataToSend
    }
  }
  return dataToSend
}

/* *******************************************
    METHOD: GET STRIPE CUSTOMER FROM STRIPE ID
*********************************************/
function _getStripeCustomerDetails (stripeID) {
  return new Promise(function (resolve, reject) {
    stripe.customers.retrieve(stripeID, function (err, customer) {
      if (err) {
        reject(err)
        return err
      }
      resolve(customer)
      return customer
    })
  })
}

// Return our 404 page -- this is a catch all for everything that didn't get caught above. See the note on the strangeness.
app.use('/', function (req, res, next) {
  res.status(404).send('Page Not Found')
})