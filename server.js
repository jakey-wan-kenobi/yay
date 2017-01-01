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
app.use('/account', express.static('../dist'))
app.use('/orders', express.static('../dist'))
app.use('/static', express.static(__dirname + '/../dist/static'))

// Create website servers
http.createServer(lex.middleware(require('redirect-https')())).listen(80)
https.createServer(lex.httpsOptions, lex.middleware(app)).listen(443)

/* *******************************************
  SETUP FIREBASE ACCESS
*********************************************/

let admin = require('firebase-admin')

admin.initializeApp({
  // TODO: Scope this admin's permissions down to the bare minimum
  credential: admin.credential.cert('../yay-app-12359-firebase-adminsdk-dsrhf-f7ffb3cda0.json'),
  databaseURL: 'https://yay-app-12359.firebaseio.com'
})

let db = admin.database()
let ref = db.ref('/')
ref.once('value', function (snapshot) {
  // console.log(snapshot.val())
})

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
    // User is confirmed with Slack! Send them to account page and give them a JWT in cookie (or localStorage)
    let nextNextResult = _prepareJWTForBrowser(nextResult)
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
function _prepareJWTForBrowser (data) {
  let token = jwt.sign({
    user_id: data.user_id,
    team_id: data.team_id
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
  const recipientHandle = _returnUserName(data.text)

  if (typeof recipientHandle !== 'string') {
    // TODO: Handle this error better with a more sophisticated response
    res.send('Hm. I couldn\'t find that user. Make sure to use their @user Slack username!')
    return
  }

  co(function * () {
    // Use method to get a prize and return it to Slack.
    let getNewPrize = yield _returnNewPrize(-1, recipientHandle)
    res.send(getNewPrize)
  }).catch(function (err) {
    // TODO: Handle error
    console.log(err)
  })
})

/* *******************************************
    MESSAGE BUTTON HANDLER
*********************************************/
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
    _purchaseThisPrize(data.callback_id, data.team.id, data.user).then(function (val) {
      res.send('Great, we did it! You\'re prize will arrive soon!')
      // TODO: Place the order in a message queue that will send email to purchaser (receipt) and to recipient (request for address)
      // Send email to purchaser
      _sendPurchaseEmails(val)
        // Send email to recipient (requesting their addrress)
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
    let handle = _returnUserName(data.callback_id)
    // console.log(data.callback_id)
    _returnNewPrize(data.actions[0].value, handle).then(function (val) {
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
    SAVE ORDER DETAILS (CREDIT CARD OR SHIPPING ADDRESS)
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
      _processDataConditionally(stripeIDCheck, creditCard, decodedJWT, shipping)
      // TODO: Turn these into async and then return status from result
      res.sendStatus(200)
    })
  })

// Decide whether to add new Stripe customer, or update an existing one
function _processDataConditionally (stripeCheck, card, auth, shipping) {
  // If team already has a stripe_id, add this card via Stripe API
  if (stripeCheck.has_stripe_id === 'yes') {
    _saveToExistingStripeCustomer(stripeCheck, card, auth, shipping)
  }
  // If team does not already have a stripe_id, create this customer via Stripe API
  if (stripeCheck.has_stripe_id === 'no') {
    _createNewStripeCustomer(card, auth, shipping)
  }
}

// Create a new Stripe customer and save to Firebase, under that user's team_id/user_id
function _createNewStripeCustomer (card, auth, shipping) {
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
      // TODO: Handle error
      console.log(err)
    }
    // TODO: Save stripe ID to Firebase
    let account = db.ref('/slack_accounts_users/' + auth.team_id + '/' + auth.user_id)
    account.update({
      stripe_id: customer.id
    })
  })
}

// Update an existing Stripe customer with the credit card they've just added.
function _saveToExistingStripeCustomer (stripeCheck, card, auth, shipping) {
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
      return
    }
    // TODO: Sucess message. Not saving to Firebase because we saved default card to Stripe. We'll just poll Stripe API if we need that data.
    // console.log('success!', customer)
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
    METHOD: RETURN NEW PRIZE
*********************************************/
function _returnNewPrize (index, recipientHandle) {
  // Retrieve products from Stripe Relay, returning a promise
  const _getProducts = function () {
    return new Promise(function (resolve, reject) {
      stripe.products.list(function (err, products) {
        if (err) {
          // TODO: Handle error
          // console.log('error', err)
          reject(err)
        }
        resolve(products.data)
        return products.data
      })
    })
  }

  // Return a promise that resolves with the new gift. This can be sent back to Slack via res.send(val)
  return new Promise(function (resolve, reject) {
    _getProducts().then(function (products) {
      let returnThisPrize = _returnNewPrizeFromList(products, index)
      resolve(returnThisPrize)
      return returnThisPrize
    }).catch(function (err) {
      // TODO: Handle error
      console.log(err)
    })
  })

  // Select the next gift from the returned list of products, based on the index we are passed from Slack button
  function _returnNewPrizeFromList (products, index) {
    // Use the index to know which product to return
    let pointer = parseInt(index, 10) || 0
    pointer++

    // If we've reached the end of the products, start over at 0.
    if (!products[pointer]) {
      pointer = 0
    }

    const getNextPrize = {
      'text': 'Teehee ☺️. Let\'s find a prize for *' + recipientHandle + '*...', // products[pointer].bot_text,
      'attachments': [
        {
          // NOTE: The callback_id is the only chance we have to get data back from the message it's coming from. So we need to stuff the current product SKU and the recipient's handle into it. Then we need to parse it into two values and pass it back into this function every time. Using a SINGLE SPACE to separate these.
          'callback_id': products[pointer].skus.data[0].id + ' ' + recipientHandle,
          'pretext': products[pointer].metadata.bot_text || 'How about this one?',
          'fallback': 'Required plain-text summary of the attachment.',
          'color': '#59FFBA',
          'title': products[pointer].name + ' by ' + products[pointer].metadata.brand,
          'title_link': products[pointer].url,
          'text': '$' + ((products[pointer].skus.data[0].price) / 100).toFixed(2) + ' | ' + products[pointer].description,
          'image_url': products[pointer].images[0],
          'actions': [
            {
              'name': 'did_choose_prize',
              'text': 'Yay, that\'s perfect!',
              'type': 'button',
              'style': 'primary',
              'value': pointer,
              'confirm': {
                'title': 'Confirm the Deets',
                'text': products[pointer].name + ' ($' + ((products[pointer].skus.data[0].price) / 100).toFixed(2) + ') for immediate delivery to ' + recipientHandle + '.',
                'ok_text': 'Place Order',
                'dismiss_text': 'Cancel'
              }
            },
            {
              'name': 'choose_next_prize',
              'text': 'No, try again',
              'type': 'button',
              'value': pointer
            },
            {
              'name': 'cancel',
              'text': 'Cancel',
              'style': 'danger',
              'type': 'button'
            }
          ]
        }
      ]
    }
    return getNextPrize
  }
}

/* *******************************************
    METHOD: PURCHASE THIS PRIZE
*********************************************/
function _purchaseThisPrize (callback_id, team_id, purchaser) {
  // Return a promise that resolves with the new gift. This can be sent back to Slack via res.send(val)
  return new Promise(function (resolve, reject) {
    // Lookup "stripe_id" from Firebase using "team_id", in order to pass to purchase function
    let accounts = db.ref('/slack_accounts_users/' + team_id + '/' + purchaser.id)
    let stripe_id = ''
    accounts.once('value').then(function (snapshot) {
      stripe_id = snapshot.child('stripe_id').val()
      if (!stripe_id) {
        // TODO: Handle no credit card
        // console.log('no credit card')
        reject('missing_credit_card')
        return false
      }
      // Place the order using the sku and stripe_id
      const sku = _parseSkuFromCallback(callback_id)
      const recipientHandle = _returnUserName(callback_id)
      stripe.orders.create({
        currency: 'usd',
        customer: stripe_id,
        metadata: {
          purchaser_id: purchaser.id,
          purchaser_name: purchaser.name,
          recipient_handle: recipientHandle,
          team_id: team_id
          // recipient_name: recipient.name,
          // recipient_id: recipient.id
        },
        items: [
          {
            type: 'sku',
            parent: sku
          }
        ],
        // NOTE: This is placeholder becuase it's required by stripe API. We're going to email the user to get this info directly, after the purchase.
        shipping: {
          name: 'Placeholder Name',
          address: {
            line1: 'Placeholder Street'
          }
        }
      }, function (err, order) {
        if (err) {
          reject(err)
          return err
        }
        resolve(order)
        return order
      })
    })
  })
}

/* *******************************************
    METHOD: SEND PURCHASE RECEIPT TO PURCHASER
*********************************************/
// Using doT.js for email template compilation: http://olado.github.io/doT/index.html
const dot = require('dot')
const fs = require('fs')
let mailgun = require('mailgun-js')({apiKey: process.env.MAILGUN_KEY, domain: 'mail.hintsygifts.com'})

function _sendPurchaseEmails (order) {
  // Get team access_token from Firebase using the team_id
  let teamAccountToken = db.ref('/slack_accounts/' + order.metadata.team_id + '/access_token')
  teamAccountToken.once('value').then(function (snapshot) {
    let access_token = snapshot.val()
    let purchaser_id = order.metadata.purchaser_id
    let recipient_handle = order.metadata.recipient_handle
    // Get the purchaser's info (name and email address) from the Slack API using the team access_token, then send them the receipt email
    _getPurchaserData(purchaser_id, access_token).then(function (val) {
      // TODO: Uncommen the below to send the receipt email to the purchaser (don't want to keep sending them)
      // _sendReceiptEmail(val.data.user.real_name, val.data.user.profile.email)
    }).catch(function (err) {
      console.log(err)
    })
    // Get a list of this team's users so we can match the user handle we have to their user handle, then send the recipient the request for address email
    _getRecipientData(access_token).then(function (val) {
      let users = val.data.members
      // Iterate through the list to find the match between users' handles
      for (var i = 0; i < users.length; i++) {
        // NOTE: The data returned by Slack API doesn't include the '@' symbold for the 'name' field (which is what they call the user handle)
        if ('@' + users[i].name === recipient_handle) {
          let recipient = users[i]
          // Send the address email to our recipient. NOTE: Is order.id a side effect here? Because we didn't pass it to _getRecipientData?
          _sendAddressEmail(recipient.profile.real_name, recipient.profile.email, order.id)
        }
      }
    }).catch(function (err) {
      console.log(err)
    })
  })

  // PROMISE: Get the purchasing user's information so we can email them the receipt.
  function _getPurchaserData (user_id, access_token) {
    let response = axios.post('https://slack.com/api/users.info', qs.stringify({
      token: access_token,
      user: user_id
    })).catch(function (error) {
      // TODO: Handle error
      console.log(error)
    })
    return response
  }

  // PROMISE: Get recipient data (using their Slack handle)so we can email them the request for a shipping address.
  function _getRecipientData (access_token) {
    let response = axios.post('https://slack.com/api/users.list', qs.stringify({
      token: access_token
    })).catch(function (error) {
      // TODO: Handle error
      console.log(error)
    })
    return response
  }

  // Send the actual receipt email, using the name and email we retrieved from Slack TODO: Make this the real receipt email template
  function _sendReceiptEmail (name, email) {
    // Create the mailgun email object
    var emailObj = {
      from: 'Hintsy <no-reply@mail.hintsygifts.com>',
      to: name + ' <' + email + '>',
      subject: 'Your Yay Prize is Purchased!',
      html: 'Purchase was made!'
    }
    // Send the mailgun email object TODO: Actually send a link to request the user's email address
    mailgun.messages().send(emailObj, function (error, body) {
      if (body) {
        console.log('success')
      } else if (error) {
        console.log('receipt error:', error)
      }
    })
  }

  // Send the actual address email, using the name and email we retrieved from Slack
  function _sendAddressEmail (name, email, orderID) {
    fs.readFile('email-templates/yay-shipping-address.html', function (error, html) {
      // Catch error
      if (error) {
        // TODO: Handle error
        console.log(error)
        return
      }
      // Data object we're going to pass to the template compiler (to populate the email with)
      let emailData = {
        name: name,
        email: email,
        orderID: orderID
      }
      // Compile the email
      let templateFn = dot.template(html)
      let compiledTmp = templateFn(emailData)
      // Create the mailgun email object
      var emailObj = {
        from: 'Hintsy <no-reply@mail.hintsygifts.com>',
        // to: name + ' <' + email + '>',
        // TODO: Uncomment the above to send the actual recipient
        to: 'Jake Allen <jacobrobertallen@gmail.com>',
        subject: 'You get a prize! 🎉 🙌 🦄  Let us know where to ship it.',
        html: compiledTmp
      }
      // Send the mailgun email object
      mailgun.messages().send(emailObj, function (error, body) {
        if (body) {
          console.log('success')
        } else if (error) {
          console.log('Shipping address error:', error)
        }
      })
    })
  }
}

/* *******************************************
    METHOD: RETURN USER HANDLE FROM TEXT
*********************************************/
function _returnUserName (text) {
  const recipient = text
  const pattern = /\B@[a-z0-9_-]+/gi
  const userName = recipient.match(pattern)
  if (!userName) {
    return false
  }
  return userName[0]
  // return userName[0].substr(1) // This removes the '@' symbol, but I decided to keep it
}

// Parse the user name off the string, and then use THAT to parse off the SKU
function _parseSkuFromCallback (text) {
  const userName = _returnUserName(text)
  // NOTE: We're replacing the @handle PLUS the space before it
  const sku = text.replace(' ' + userName, '')
  // console.log(sku)
  return sku
}

// Return our 404 page -- this is a catch all for everything that didn't get caught above. See the note on the strangeness.
app.use('/', function (req, res, next) {
  res.status(404).send('Page Not Found')
})
