// Exchange the Slack code for an access token (see here: https://api.slack.com/methods/oauth.access)
let _exchangeCodeForToken = function (codeRecieved, callBack) {
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
      // TODO: Handle error. Sentry system.
      return
    }
    // TODO: Handle success. Save to Firebase. Etc.
    callBack(JSON.parse(body))
  })
}

module.exports._exchangeCodeForToken = _exchangeCodeForToken
