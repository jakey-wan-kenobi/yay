let express = require('express')
let app = express()
let https = require('https')
let http = require('http')
let request = require('request')

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

app.get('/', function (req, res) {
  res.send('<a href="https://slack.com/oauth/authorize?scope=commands,bot&client_id=104436581472.112407214276"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>')
})

http.createServer(lex.middleware(require('redirect-https')())).listen(80)
https.createServer(lex.httpsOptions, lex.middleware(app)).listen(443)

/* *******************************************
  SETUP FIREBASE ACCESS
*********************************************/

let admin = require('firebase-admin')

admin.initializeApp({
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

let api = express()
https.createServer(lex.httpsOptions, lex.middleware(api)).listen(3000)

// Create New Account. Handle OAuth redirect: grab the code that is returned when user approves Yay app, and exchange it with Slack API for real access tokens. Then save those tokens and all the account info to Firebase.
api.get('/oauth-redirect', function (req, res) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
  res.header('Access-Control-Allow-Methods', 'Post, Get, Options')
  if (req.query.error) {
    res.send(req.query.error)
    return
  }
  // TODO: Verify that req.query.state matches the unique state of the user (still tbd) and then exchange the req.query.code for an access token as specified here: https://api.slack.com/methods/oauth.access
  _exchangeCodeForToken(req.query.code)
})

// Exchange the Slack code for an access token (see here: https://api.slack.com/methods/oauth.access)
function _exchangeCodeForToken (codeRecieved) {
  request.post({
    url: 'https://slack.com/api/oauth.access',
    form: {
      client_id: '104436581472.112407214276',
      // TODO: Put this in an .env file
      client_secret: '116f4ab5fe3b5d2b1be59bff4a2010e6',
      code: codeRecieved
      // redirect_uri: 'https://yay.hintsy.io/oauth-redirect'
    }
  }, function (err, httpResponse, body) {
    if (err) {
      // TODO: Handle error
      return
    }
    // TODO: Handle success. Save to Firebase. Etc.
    _saveNewSlackAccount(JSON.parse(body))
  })
}

// Save the data received from Slack to Firebase
function _saveNewSlackAccount (body) {
  // If we have an error, stop
  if (body.ok !== true) {
    // NOTE: Error ocurred here.
    console.log('body ok false')
    return
  }
  let accounts = db.ref('/slack-accounts')
  // Check whether team already exists in our Firebase
  accounts.once('value').then(function (snapshot) {
    if (snapshot.child(body.team_id).exists()) {
      console.log('this team exists')
      // TODO: This team already exists -- what do we want to do now?
      // return
    }
  })
  // Save the new team and data to Firebase
  accounts.child(body.team_id).set(body, console.log('success?'))
}

/* *******************************************
    YAY SLASH COMMAND
*********************************************/
api.post('/yay', function (req, res) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
  res.header('Access-Control-Allow-Methods', 'Post, Get, Options')

  // Make sure it's the right user/team
  // if (req.body.token !== 'XH7s8DjEOHTBEyO6tOGKZx9Y') {
  //   return false
  // }

  var messageBlock = {
    "text": "Wonderful! Let's send a gift to Beth. How about this?",
    "attachments": [
        {
          "callback_id": "choose_prize",
          "fallback": "Required plain-text summary of the attachment.",
          "color": "#59FFBA",
          // "pretext": "Wonderful! Let's send a gift to Beth. How about this?",
          "title": "Golden Coast Soy Candle by P.F. Candle Co.",
          "title_link": "https://hintsygifts.com/shop/P.F.-Candle-Co./Soy-Candle",
			    "text": "$18 | Hand poured in a sunny studio in LA's Arts District.",
          "image_url": "https://res.cloudinary.com/hintsy/image/upload/v1480701134/amberandmosscandle_xzgufv.jpg",
          // "thumb_url": "http://example.com/path/to/thumb.png",
          // "footer": "Slack API",
          // "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
          // "ts": 123456789,
          "actions": [
            {
                "name": "did_choose_prize",
                "text": "Yes, that's perfect!",
                "type": "button",
                "style": "primary",
                "value": "true"
            },
            {
                "name": "did_choose_prize",
                "text": "No, try again",
                "type": "button",
                "value": "false"
            },
            {
                "name": "Cancel",
                "text": "Cancel",
                "style": "danger",
                "type": "button",
                "value": "cancel"
            }
          ]
      }
    ]
  }

  res.send(messageBlock)
})

/* *******************************************
    MESSAGE BUTTON HANDLER
*********************************************/
// Parse application/x-www-form-urlencoded
let bodyParser = require('body-parser')
api.use(bodyParser.urlencoded({ extended: false }))
api.post('/yay-message-buttons', function (req, res) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept')
  res.header('Access-Control-Allow-Methods', 'Post, Get, Options')

  // Make sure it's the right user/team
  // if (req.body.token !== 'XH7s8DjEOHTBEyO6tOGKZx9Y') {
  //   return false
  // }
  console.log(req.body.payload)
  // res.send('yes')
})
