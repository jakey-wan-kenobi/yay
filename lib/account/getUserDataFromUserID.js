/**
* Takes a Slack user id and returns their real name.
* @param {String} token The Slack access token.
* @param {String} userID The Slack user's user id.
* @todo Handle when Promise object returned is an error object.
*/

import axios from 'axios'
import qs from 'querystring'
import raven from 'raven'

function getUserDataFromUserID (token, userID) {
  return axios.post('https://slack.com/api/users.info', qs.stringify({
    token: token,
    user: userID
  })).catch(function (error) {
    // Error handler
    raven.captureException(error, {
      extra: {
        description: 'Error accessing a URL with axios',
        id: 476260
      }
    })
  })
}

export default getUserDataFromUserID
