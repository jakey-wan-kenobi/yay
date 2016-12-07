'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)();
var https = require('https');
var http = require('http');
var request = require('request');

/* *******************************************
  LETS-ENCRYPT SSL SETUP
*********************************************/

// Returns an instance of node-letsencrypt with additional helper methods
var lex = require('letsencrypt-express').create({
  server: 'https://acme-v01.api.letsencrypt.org/directory',
  challenges: { 'http-01': require('le-challenge-fs').create({ webrootPath: '/tmp/acme-challenges' }) },
  store: require('le-store-certbot').create({ webrootPath: '/tmp/acme-challenges' }),
  approveDomains: approveDomains
});

// This is where you check your database and associated email addresses with domains and agreements and such
function approveDomains(opts, certs, cb) {
  // The domains being approved for the first time are listed in opts.domains
  // Certs being renewed are listed in certs.altnames
  if (certs) {
    opts.domains = certs.altnames;
  } else {
    opts.email = 'jake@hintsygifts.com';
    opts.agreeTos = true;
  }

  // NOTE: you can also change other options such as `challengeType` and `challenge`
  // opts.challengeType = 'http-01';
  // opts.challenge = require('le-challenge-fs').create({});
  cb(null, { options: opts, certs: certs });
}

app.get('/', function (req, res) {
  res.send('<a href="https://slack.com/oauth/authorize?scope=commands,bot,users:read&client_id=104436581472.112407214276"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>');
});

http.createServer(lex.middleware(require('redirect-https')())).listen(80);
https.createServer(lex.httpsOptions, lex.middleware(app)).listen(443);

/* *******************************************
  SETUP FIREBASE ACCESS
*********************************************/

var admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert('yay-app-12359-firebase-adminsdk-dsrhf-f7ffb3cda0.json'),
  databaseURL: 'https://yay-app-12359.firebaseio.com'
});

var db = admin.database();
var ref = db.ref('/');
ref.once('value', function (snapshot) {
  // console.log(snapshot.val())
});

/* *******************************************
  API ENDPOINTS
*********************************************/

var api = (0, _express2.default)();
https.createServer(lex.httpsOptions, lex.middleware(api)).listen(3000);

// Create New Account. Handle OAuth redirect: grab the code that is returned when user approves Yay app, and exchange it with Slack API for real access tokens. Then save those tokens and all the account info to Firebase.
api.get('/oauth-redirect', function (req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept');
  res.header('Access-Control-Allow-Methods', 'Post, Get, Options');
  if (req.query.error) {
    res.send(req.query.error);
    return;
  }
  // TODO: Verify that req.query.state matches the unique state of the user (still tbd) and then exchange the req.query.code for an access token as specified here: https://api.slack.com/methods/oauth.access
  _exchangeCodeForToken(req.query.code);
});

// Exchange the Slack code for an access token (see here: https://api.slack.com/methods/oauth.access)
function _exchangeCodeForToken(codeRecieved) {
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
      return;
    }
    // TODO: Handle success. Save to Firebase. Etc.
    _saveNewSlackAccount(JSON.parse(body));
  });
}

// Save the data received from Slack to Firebase
function _saveNewSlackAccount(body) {
  // If we have an error, stop
  if (body.ok !== true) {
    // NOTE: Error ocurred here.
    console.log('body ok false');
    return;
  }
  var accounts = db.ref('/slack_accounts');
  // Check whether team already exists in our Firebase
  accounts.once('value').then(function (snapshot) {
    if (snapshot.child(body.team_id).exists()) {
      console.log('this team exists');
      // TODO: This team already exists -- what do we want to do now?
      // return
    }
  });
  // Save the new team and data to Firebase
  accounts.child(body.team_id).set(body, console.log('success?'));
}

/* *******************************************
    YAY SLASH COMMAND
*********************************************/
// Parse application/x-www-form-urlencoded
var bodyParser = require('body-parser');
api.use(bodyParser.urlencoded({ extended: false }));
api.post('/yay', function (req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept');
  res.header('Access-Control-Allow-Methods', 'Post, Get, Options');

  // Make sure it's the right user/team
  // if (req.body.token !== 'XH7s8DjEOHTBEyO6tOGKZx9Y') {
  //   return false
  // }

  var data = req.body;

  // Step 1: TODO: Parse the user name out of the req.body.text field. Use a regex pattern to grab from @string. For now, just grabbing entire text body
  // const recipient = data.text

  // Step 2: Get "access_token" from Firebase with "data.team_id"
  var accounts = db.ref('/slack_accounts/' + data.team_id);
  accounts.once('value').then(function (snapshot) {
    var access_token = snapshot.child('access_token').val();
    _getUserList(access_token);
  });

  // Step 3: Get user list using "access_token"
  function _getUserList(access_token) {
    request.post({
      url: 'https://slack.com/api/users.list',
      form: {
        // TODO: Put this in an .env file
        token: access_token
      }
    }, function (err, httpResponse, body) {
      if (err) {
        // TODO: Handle error
        return;
      }
      // TODO: Step 4 here
      console.log(JSON.parse(body));
    });
  }

  // Step 4: TODO: Parse through member list to find member with "name" that equals handle we've parsed out of text

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

  var messageBlock = {
    'text': 'Wonderful! Let\'s send a prize to @hintsybeth. How about this?',
    'attachments': [{
      'callback_id': 'choose_prize',
      'fallback': 'Required plain-text summary of the attachment.',
      'color': '#59FFBA',
      'title': 'Golden Coast Soy Candle by P.F. Candle Co.',
      'title_link': 'https://hintsygifts.com/shop/P.F.-Candle-Co./Soy-Candle',
      'text': '$18 | Hand poured in a sunny studio in LA\'s Arts District.',
      'image_url': 'https://res.cloudinary.com/hintsy/image/upload/v1480701134/amberandmosscandle_xzgufv.jpg',
      'actions': [{
        'name': 'did_choose_prize',
        'text': 'Yay, that\'s perfect!',
        'type': 'button',
        'style': 'primary'
      }, {
        'name': 'choose_next_prize',
        'text': 'No, try again',
        'type': 'button'
      }, {
        'name': 'cancel',
        'text': 'Cancel',
        'style': 'danger',
        'type': 'button'
      }]
    }]
  };

  res.send(messageBlock);
});

/* *******************************************
    MESSAGE BUTTON HANDLER
*********************************************/
api.post('/yay-message-buttons', function (req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept');
  res.header('Access-Control-Allow-Methods', 'Post, Get, Options');

  // Make sure the request is coming from Slack TODO: make env variable
  // if (req.body.token !== 'XH7s8DjEOHTBEyO6tOGKZx9Y') {
  //   return false
  // }
  var data = JSON.parse(req.body.payload);
  console.log(data);
  // NOTE: From Slack docs: "Though presented as an array, at this time you'll only receive a single action per incoming invocation."
  if (data.actions[0].name === 'did_choose_prize') {
    res.send('prize chosen');
  } else if (data.actions[0].name === 'choose_next_prize') {
    var differentPrize = {
      'text': 'Okay, tough crowd. How about this one?',
      'attachments': [{
        'callback_id': 'choose_prize',
        'fallback': 'Required plain-text summary of the attachment.',
        'color': '#59FFBA',
        'title': 'Special Edition Notebooks by Field Notes',
        'title_link': 'https://hintsygifts.com/shop/Field-Notes/Special-Edition-Notebooks',
        'text': '$13 | Waterproof and tear-proof, this paper will survive the rough and tumble of your journeys.',
        'image_url': 'https://res.cloudinary.com/hintsy/image/upload/v1477860719/expedition1_vg9s9f.jpg',
        'actions': [{
          'name': 'did_choose_prize',
          'text': 'Yay, that\'s perfect!',
          'type': 'button',
          'style': 'primary'
        }, {
          'name': 'choose_next_prize',
          'text': 'No, try again',
          'type': 'button'
        }, {
          'name': 'cancel',
          'text': 'Cancel',
          'style': 'danger',
          'type': 'button'
        }]
      }]
    };
    res.send(differentPrize);
  } else if (data.actions[0].name === 'cancel') {
    res.send('canceled prize');
  }
  // res.send('yes')
});