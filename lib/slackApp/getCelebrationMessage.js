/**
* Returns the celebration message after a purchase, with an argument that specifies whether we should update the "Yes, drop a hint" message.
* @param {Boolean} clickStatus Optional. What state the message should be in (did they click yes, no, or is it the first time we're sending it, in which case we don't pass this value). This will determine the status of the "Should we drop a hint" message buttons.
*/

function getCelebrationMessage (clickStatus) {
  const data = {
    'text': 'Great, we did it! You\'re prize will arrive soon! 🚀',
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
    'text': 'Great, we did it! You\'re prize will arrive soon! 🚀',
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
        'text': '✅ Sweeeet! I love this part. 🎉'
      }
    ]
  }
  const dataClickNo = {
    'text': 'Great, we did it! You\'re prize will arrive soon! 🚀',
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
  switch (clickStatus) {
    case true:
      return dataClickYes
    case false:
      return dataClickNo
    case undefined:
      return data
  }
}

export default getCelebrationMessage
