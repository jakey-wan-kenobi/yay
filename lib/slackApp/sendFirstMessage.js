/**
* Send the first message to the Slack user who installed the app, so we can onboard them and finish setup.
* @todo For some reason we can't parse the array on 'attachments' (so they get dropped off). It has something to do with the qs.stringify. Perhaps if we format differently it'll work.
* @todo Handle errors.
* @param {String} channelID This is the id of the Slack channel we're going to send to.
* @param {String} authToken The Slack API token for this team, which allows to send the message to the user.
*/

import axios from 'axios'
import qs from 'querystring'

function sendFirstMessage (channelID, authToken) {
  const data = qs.stringify({
    'token': authToken,
    'channel': channelID,
    'text': 'Hi! 👋 I\'m Stanley the Unicorn. Yay is for sending prizes to your Slack friends.',
    'attachments': JSON.stringify([
      {
        'text': '*Would you like me to introduce myself to the team?*',
        'fallback': 'Can\'t finish setup',
        'callback_id': 'intro_buttons',
        'color': '#59FFBA',
        'attachment_type': 'default',
        'mrkdwn_in': [
          'text',
          'pretext'
        ],
        'actions': [
          {
            'name': 'yes_intro',
            'text': 'Yes, let\'s do it',
            'type': 'button'
          },
          {
            'name': 'no_intro',
            'text': 'No, I\'ll do it later',
            'type': 'button'
          }
        ]
      },
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
  axios.post('https://slack.com/api/chat.postMessage', data).then(function (response) {
    // NOTE Do we need to do anything with this response?
    // console.log(response)
  }).catch(function (error) {
    // TODO Handle error
    console.log(error)
  })
}

// sendFirstMessage('D3AGCH5EG', 'xoxb-113155900102-5xRl1guEm7iryjRPEmUkxY6J')

export default sendFirstMessage
