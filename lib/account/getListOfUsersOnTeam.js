/**
* Retrieves a list of all the users on a Slack team. Returns a promise.
* @param {String} token The access token for the team we're targeting.
*/

import axios from 'axios'
import qs from 'querystring'

function getListOfUsersOnTeam (token) {
  return axios.post('https://slack.com/api/users.list', qs.stringify({
    token: token
  })).catch(function (error) {
    // TODO: Handle error
    console.log(error)
  })
}

export default getListOfUsersOnTeam
