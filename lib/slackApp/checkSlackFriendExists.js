/**
* Make sure this Slack user actually exists on the relevant Slack team. Returns a promise.
* @param {String} handle This is the user handle we're checking.
* @param {String} teamID This is the Slack team id of the team we're checking against.
*/

import getBotSlackTokenFromTeamID from '../account/getBotSlackTokenFromTeamID'
import getListOfUsersOnTeam from '../account/getListOfUsersOnTeam'
import captureException from '../core/captureException'

function checkSlackFriendExists (handle, teamID) {
  return new Promise(function (resolve, reject) {
    (async function () {
      // NOTE: This needs to be the bot Slack token, otherwise we don't have permissions for users.list method.
      const slackToken = await getBotSlackTokenFromTeamID(teamID)
      const userData = await getListOfUsersOnTeam(slackToken)
      const userArray = userData.data.members
      // Iterate through the list to find the match between users' handles
      for (var i = 0; i < userArray.length; i++) {
        // NOTE: The data returned by Slack API doesn't include the '@' symbold for the 'name' field (which is what they call the user handle)
        if ('@' + userArray[i].name === handle) {
          // Match found. This is our user: userArray[i]
          if (userArray[i].is_bot || userArray[i].name === 'slackbot') {
            resolve('isBot')
            return
          }
          resolve(true)
          return
        }
      }
      resolve(false)
      return
    })().catch(function (err) {
      // Error handler
      captureException(err, 'Error running async function in checkSlackFriendExists.', 120210)
      reject(err)
    })
  })
}

export default checkSlackFriendExists
