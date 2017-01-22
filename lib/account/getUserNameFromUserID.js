/**
* Takes a Slack user id and returns their real name.
* @param {String} token The Slack access token.
* @param {String} userID The Slack user's user id.
*/

import axios from 'axios'
import qs from 'querystring'

function getUserNameFromUserID (token, userID) {
  return axios.post('https://slack.com/api/users.info', qs.stringify({
    token: token,
    user: userID
  })).catch(function (error) {
    // TODO: Handle error
    console.log(error)
  })
}

export default getUserNameFromUserID
