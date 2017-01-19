/**
* Returns the introductory message sent to the entire team, in the #general channel.
* @param {String} token The bot auth token used to send this message to the general channel.
* @param {String} channelID The general channel id for this team. This is the channel we're posting to.
*/

import qs from 'querystring'

function getTeamIntroMessage (token, channelID) {
  const introMessage = qs.stringify({
    'token': token,
    'channel': channelID,
    'text': 'Hi! 👋 I\'m Stanley the Unicorn. Yay is for sending prizes to your Slack friends.',
    'attachments': JSON.stringify([
      {
        'title': 'Here\'s all the tricks I can do!',
        'color': '#ff6199',
        'text': '`/yay @[user]` To send a prize to a Slack friend. \n `/yay account` To edit your account. \n `/yay help` To learn how it works.',
        'mrkdwn_in': [
          'text',
          'pretext'
        ]
      },
      {
        'title': 'Try it out!',
        'color': '#6ddefe',
        'text': 'Type `/yay @[your Slack friend]` and see what happens! (Don\'t worry, you can just try it out).',
        'mrkdwn_in': [
          'text'
        ]
      }
    ])
  })
  return introMessage
}

export default getTeamIntroMessage
