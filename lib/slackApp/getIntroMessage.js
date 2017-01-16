/**
* Returns the introductory message, with an argument that specifies whether we should update the "Yes, let's do it" message.
* @param {String} channelID The ID of the Slack channel we're targeting.
* @param {String} authToken The auth token of the bot who will be sending this message.
* @param {Boolean} clickStatus Optional. What state the message should be in (did they click yes, no, or is it the first time we're sending it, in which case we don't pass this value). This will determine the status of the "Should we introduct Yay to the team" message buttons.
*/

import qs from 'querystring'

function getIntroMessage (channelID, authToken, clickStatus) {
  const data = qs.stringify({
    'token': authToken,
    'channel': channelID,
    'text': 'Hi! 👋 I\'m Stanley the Unicorn. I can help you send prizes to your Slack friends.',
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
  const dataClickYes = {
    'text': 'Hi! 👋 I\'m Stanley the Unicorn. I can help you send prizes to your Slack friends.',
    'attachments': [
      {
        'text': '✅ Great! I\'m on it!',
        'fallback': 'Can\'t reach the team',
        'color': '#59FFBA'
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
    ]
  }
  const dataClickNo = qs.stringify({
    'text': 'Hi! 👋 I\'m Stanley the Unicorn. I can help you send prizes to your Slack friends.',
    'attachments': JSON.stringify([
      {
        'text': 'Okey dokey',
        'fallback': 'Can\'t reach the team',
        'callback_id': 'intro_buttons',
        'color': '#59FFBA',
        'attachment_type': 'default',
        'mrkdwn_in': [
          'text',
          'pretext'
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
  // Send the intro message, with varying states of the message buttons, depending on user input.
  switch (clickStatus) {
    case true:
      return dataClickYes
    case false:
      return dataClickNo
    case undefined:
      return data
  }
}

export default getIntroMessage
