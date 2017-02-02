/**
* Get Slack user data (all of the details of their account), using their Slack user handle.
*
*
*/

import getListOfUsersOnTeam from '../account/getListOfUsersOnTeam'

function getSlackUserDataFromHandle (slackAccessToken, handle) {
  return new Promise(function (resolve, reject) {
    (async function () {
      const userList = await getListOfUsersOnTeam(slackAccessToken)
      const users = userList.data.members
      // Iterate through the list to find the match between users' handles
      for (var i = 0; i < users.length; i++) {
        // NOTE: The data returned by Slack API doesn't include the '@' symbold for the 'name' field (which is what they call the user handle)
        if ('@' + users[i].name === handle) {
          let recipient = users[i]
          // Send the address email to our recipient. NOTE: Is order.id a side effect here? Because we didn't pass it to _getRecipientData?
          resolve(recipient)
          return
        }
      }
      // User not found.
      reject(false)
    })()
  })
}

export default getSlackUserDataFromHandle
