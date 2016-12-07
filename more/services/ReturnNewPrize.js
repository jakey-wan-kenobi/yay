import { products } from 'Products'

function returnNewPrize (index) {

  let pointer = index || 0

  const differentPrize = {
    'text': 'Okay, tough crowd. How about this one?',
    'attachments': [
      {
        'callback_id': 'choose_prize',
        'fallback': 'Required plain-text summary of the attachment.',
        'color': '#59FFBA',
        'title': 'Special Edition Notebooks by Field Notes',
        'title_link': 'https://hintsygifts.com/shop/Field-Notes/Special-Edition-Notebooks',
        'text': '$13 | Waterproof and tear-proof, this paper will survive the rough and tumble of your journeys.',
        'image_url': 'https://res.cloudinary.com/hintsy/image/upload/v1477860719/expedition1_vg9s9f.jpg',
        'actions': [
          {
            'name': 'did_choose_prize',
            'text': 'Yay, that\'s perfect!',
            'type': 'button',
            'style': 'primary'
          },
          {
            'name': 'choose_next_prize',
            'text': 'No, try again',
            'type': 'button'
          },
          {
            'name': 'cancel',
            'text': 'Cancel',
            'style': 'danger',
            'type': 'button'
          }
        ]
      }
    ]
  }
}
