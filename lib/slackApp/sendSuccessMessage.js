/**
* Returns the celebration message after a purchase, with an argument that specifies whether we should update the "Yes, drop a hint" message.
* @param {Boolean} clickStatus Optional. What state the message should be in (did they click yes, no, or is it the first time we're sending it, in which case we don't pass this value). This will determine the status of the "Should we drop a hint" message buttons.
* @param {String} channelID The channel we're sending the response to.
* @param {String} teamID The teamID so we can get the bot Slack token and check whether bot has access to the channel in question.
* @param {Function} res The express res object, so we can send a response back to the channel.
*/

import getBotSlackTokenFromTeamID from '../account/getBotSlackTokenFromTeamID'
import checkChannelAccess from '../slackApp/checkChannelAccess'

function sendSuccessMessage (clickStatus, channelID, teamID, res) {
  // If clickStatus is undefined (meaning we're not just sending a follow-up "Okay great" or "Okay we won't say anything"), then we need to check if bot has access, otherwise we don't even need to check (because we know they have access, otherwise we wouldn't have gotten a click response to the update message).
  if (clickStatus === undefined) {
    (async function () {
      // First check if the bot has access to the channel we're dealing with. If not, we'll have to hide the "drop a hint" option.
      const botToken = await getBotSlackTokenFromTeamID(teamID)
      const botHasAccess = await checkChannelAccess(botToken, channelID)
      if (botHasAccess) {
        // Send the full success message
        res.send(data)
        return
      }
      // Send the cropped success message
      res.send(dataCropped)
      return
    })()
  }
  const dataCropped = {
    'text': 'Great, we did it! 👏 We emailed the recipient for their shipping address, and we\'ll ship your prize as soon as we get it! 🚀'
  }
  const data = {
    'text': 'Great, we did it! 👏 We emailed the recipient for their shipping address, and we\'ll ship your prize as soon as we get it! 🚀',
    'attachments': [
      {
        'text': '*Would you like me to drop a hint in this channel?*',
        'fallback': 'Can\'t drop hint',
        'callback_id': 'drop_hint',
        'color': '#59FFBA',
        'attachment_type': 'default',
        'mrkdwn_in': [
          'text',
          'pretext'
        ],
        'actions': [
          {
            'name': 'yes_drop_hint',
            'text': 'Yes, drop a hint',
            'type': 'button'
          },
          {
            'name': 'no_drop_hint',
            'text': 'No, keep it secret',
            'type': 'button'
          }
        ]
      }
    ]
  }
  const dataClickYes = {
    'text': 'Great, we did it! 👏 We emailed the recipient for their shipping address, and we\'ll ship your prize as soon as we get it! 🚀',
    'attachments': [
      {
        'text': '*Would you like me to drop a hint in this channel?*',
        'fallback': 'Can\'t drop hint',
        'callback_id': 'drop_hint',
        'color': '#59FFBA',
        'attachment_type': 'default',
        'mrkdwn_in': [
          'text',
          'pretext'
        ]
      },
      {
        'text': '✅ Weeeeee! I love this part. 🎉'
      }
    ]
  }
  const dataClickNo = {
    'text': 'Great, we did it! 👏 We emailed the recipient for their shipping address, and we\'ll ship your prize as soon as we get it! 🚀',
    'attachments': [
      {
        'text': '*Would you like me to drop a hint in this channel?*',
        'fallback': 'Can\'t drop hint',
        'callback_id': 'drop_hint',
        'color': '#59FFBA',
        'attachment_type': 'default',
        'mrkdwn_in': [
          'text',
          'pretext'
        ]
      },
      {
        'text': '❎ Okay, let\'s keep it a surprise.'
      }
    ]
  }
  // If this isn't the first time, determine whether to show the clicked yes or clicked no state
  switch (clickStatus) {
    case true:
      res.send(dataClickYes)
      break
    case false:
      res.send(dataClickNo)
      break
  }
}

export default sendSuccessMessage
