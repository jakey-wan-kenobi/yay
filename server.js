let express = require('express')
let app = express()
let https = require('https')
let http = require('http')
let request = require('request')
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

// Serve website
app.get('/', function (req, res) {
  res.send('<a href="https://slack.com/oauth/authorize?scope=commands,bot,users:read&client_id=104436581472.112407214276"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a><a href="https://slack.com/oauth/authorize?scope=identity.basic&client_id=104436581472.112407214276"><img alt="Sign in with Slack" src="https://api.slack.com/img/sign_in_with_slack.png" srcset="https://platform.slack-edge.com/img/sign_in_with_slack.png 1x, https://platform.slack-edge.com/img/sign_in_with_slack@2x.png 2x"/></a>')
})

/* *******************************************
  SERVE YAY WEBSITE
*********************************************/
app.use('/account', express.static('dist'))
app.use('/static', express.static(__dirname + '/dist/static'))

// Create website servers
http.createServer(lex.middleware(require('redirect-https')())).listen(80)
https.createServer(lex.httpsOptions, lex.middleware(app)).listen(443)

/* *******************************************
  SETUP FIREBASE ACCESS
*********************************************/

let admin = require('firebase-admin')

admin.initializeApp({
  // TODO: Scope this admin's permissions down to the bare minimum
  credential: admin.credential.cert('yay-app-12359-firebase-adminsdk-dsrhf-f7ffb3cda0.json'),
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

  if (data.text.indexOf('account') > -1) {
    // TODO: Return account link
    res.send('Go here to edit & view your account details: https://yay.hintsy.io/account/' + data.team_id)
    return
  }

  // Step 1: Parse the user name out of the req.body.text field. Use a regex pattern to grab from @string. For now, just grabbing entire text body
  const returnUserName = function (text) {
    const recipient = text
    const pattern = /\B@[a-z0-9_-]+/gi
    const userName = recipient.match(pattern)
    return userName[0].substr(1)
  }
  const thisUserName = returnUserName(data.text)

  // Step 2: Get "access_token" from Firebase with "data.team_id"
  let accounts = db.ref('/slack_accounts/' + data.team_id)
  accounts.once('value').then(function (snapshot) {
    let access_token = snapshot.child('access_token').val()
    _getUserList(access_token)
  })

  // Step 3: Get user list using "access_token"
  function _getUserList (access_token) {
    request.post({
      url: 'https://slack.com/api/users.list',
      form: {
        token: access_token
      }
    }, function (err, httpResponse, body) {
      if (err) {
        // TODO: Handle error
        return
      }
      // TODO: Step 4 here
      _getRecipientInfo(thisUserName, JSON.parse(body).members)
    })
  }

  // Step 4: TODO: Parse through member list to find member with "name" that equals handle we've parsed out of text
  function _getRecipientInfo (userName, userList) {
    for (var i = 0; i < userList.length; i++) {
      if (userList[i].name === userName) {
        console.log('This is our user:', userList[i].real_name)
      }
    }
  }

  // Example request body in "req.body"
  // { token: 'ERJo2Nrv9AE5fULeYegRHIWS',
  //   team_id: 'T32CUH3DW',
  //   team_domain: 'hintsy',
  //   channel_id: 'D3AGCH5EG',
  //   channel_name: 'directmessage',
  //   user_id: 'U3326P63D',
  //   user_name: 'jake',
  //   command: '/yay',
  //   text: '@jake',
  //   response_url: 'https://hooks.slack.com/commands/T32CUH3DW/113315981924/7KqhP2GqmwhQVs5ebFcflCvY' }

  co(function * () {
    // Use method to get a prize and return it to Slack.
    let getNewPrize = yield _returnNewPrize(-1)
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
    // TODO: Write the purchase function. Note that this needs to return a promise and be awaited.
    let getThisPrize = _purchaseThisPrize(data.actions[0].value)
    res.send(getThisPrize)
  } else if (data.actions[0].name === 'choose_next_prize') {
    // Get a new gift using our global method.
    _returnNewPrize(data.actions[0].value).then(function (val) {
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
    // Check whether stripe_id exists, and then decide how to process data recieved (may be credit card token from Stripe, or shipping address data)
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

// Create a new Stripe customer and save to Firebase
function _createNewStripeCustomer (card, auth, shipping) {
  stripe.customers.create({
    description: 'Slack team ' + auth.team_id,
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
    let account = db.ref('/slack_accounts/' + auth.team_id)
    account.update({
      stripe_id: customer.id
    })
  })
}

// Update an existing Stripe customer
function _saveToExistingStripeCustomer (stripeCheck, card, auth, shipping) {
  console.log(shipping, stripeCheck.stripe_id)
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
    console.log('success!', customer)
  })
}

// Check if customer already has a stripe_id
function _checkForStripeID (auth) {
  let stripeDataCheck = {}
  let response = new Promise(function (resolve, reject) {
    // Check whether a stripe_id already exists for this team
    let accounts = db.ref('/slack_accounts/' + auth.team_id)
    // Check whether team already exists in our Firebase
    accounts.once('value').then(function (snapshot) {
      let team = snapshot.val()
      switch (typeof team.stripe_id === 'string') {
        case true:
          stripeDataCheck.has_stripe_id = 'yes'
          stripeDataCheck.stripe_id = team.stripe_id
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
function _returnNewPrize (index) {
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
      console.log(returnThisPrize)
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
      'text': 'Testing the bot text', // products[pointer].bot_text,
      'attachments': [
        {
          'callback_id': 'choose_prize',
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
              'value': pointer
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
function _purchaseThisPrize (index, products) {
  // If we don't have a value, return an error. Something went wrong. TODO: Sentry report here.
  if (!index) {
    return
  }

  // This prize was selected
  // let selectedPrize = products[index]

  // Place the order
  // let _placeOrder = function (price, stripe) {
  //  let chargeAmount = selectedPrize.price * 100
  //  let stripeID = 'id here' // TODO: Stripe ID
  // }
}
