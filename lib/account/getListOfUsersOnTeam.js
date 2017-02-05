/**
* Retrieves a list of all the users on a Slack team. Returns a promise.
* @param {String} token The access token for the team we're targeting.
* @todo Handle when Promise object returned resolves to an error.
*/

import axios from 'axios'
import qs from 'querystring'
import captureException from '../core/captureException'

function getListOfUsersOnTeam (token) {
  return axios.post('https://slack.com/api/users.list', qs.stringify({
    token: token
  })).catch(function (error) {
    // Error handler
    captureException(error, 'Error accessing a URL with axios', 271463)
  })
}

export default getListOfUsersOnTeam
