/**
* Make sure this Slack user actually exists on the relevant Slack team. Returns a promise.
* @param {String} handle This is the user handle we're checking.
* @param {String} teamID This is the Slack team id of the team we're checking against.
*/

import getSlackTokenFromTeamID from '../account/getSlackTokenFromTeamID'
import getListOfUsersOnTeam from '../account/getListOfUsersOnTeam'

function checkSlackFriendExists (handle, teamID) {
  // Self-executing async function
  return new Promise(function (resolve, reject) {
    (async function () {
      const slackToken = await getSlackTokenFromTeamID(teamID)
      const userData = await getListOfUsersOnTeam(slackToken)
      const userArray = userData.data.members
      // Iterate through the list to find the match between users' handles
      for (var i = 0; i < userArray.length; i++) {
        // NOTE: The data returned by Slack API doesn't include the '@' symbold for the 'name' field (which is what they call the user handle)
        if ('@' + userArray[i].name === handle) {
          // Match found. This is our user: userArray[i]
          resolve(true)
        }
      }
      resolve(false)
    })().catch(function (err) {
      // TODO: Catch err
      console.log(err)
      reject(err)
    })
  })
}

export default checkSlackFriendExists
