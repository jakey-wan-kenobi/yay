/**
* Select the next prize from the returned list of Slack prizes, based on the index we are passed from Slack button.
* @todo Make sure we skip over products whose inventory is 0.
* @param {Object} products This is a Stripe array of all products in inventory.
* @param {String} index This is a number indicating what product we should display next.
* @param {String} recipientHandle This is the user we're giving the prize to.
*/

function getNextPrizeMessageFromList (products, index, recipientHandle) {
  // Increment the pointer to display (or show the first one, if we don't have a pointer)
  let pointer = parseInt(index, 10) || 0
  pointer++

  // If we've reached the end of the products (i.e. that index of the products array is empty), start over at the beginning of the products list (i.e. the 0 index).
  if (!products[pointer]) {
    pointer = 0
  }

  // If this product is sold out, or there are no skus, skip it. Do this recursively until we reach a product that's available.
  function _checkInventory (product) {
    // Check that this product has skus to sell.
    let skus = product.skus.data[0]
    if (!skus) {
      pointer++
      _checkInventory(products[pointer])
      return
    }
    // Check that this product has inventory to sell.
    let quantity = product.skus.data[0].inventory.quantity
    if (quantity <= 0) {
      pointer++
      _checkInventory(products[pointer])
      return
    }
  }
  _checkInventory(products[pointer])

  const getNextPrize = {
    'text': '*Teehee ☺️. Let\'s find a prize for ' + recipientHandle + '*...', // products[pointer].bot_text,
    'attachments': [
      {
        // NOTE: The callback_id is the only chance we have to get data back from the message it's coming from. So we need to stuff the current product SKU and the recipient's handle into it. Then we need to parse it into two values and pass it back into this function every time. Using a SINGLE SPACE to separate these.
        'callback_id': products[pointer].skus.data[0].id + ' ' + recipientHandle,
        'pretext': products[pointer].caption || 'How about this one?',
        'fallback': 'Can\'t choose a prize.',
        'color': '#59FFBA',
        'title': products[pointer].name,
        'title_link': products[pointer].url,
        'text': '$' + ((products[pointer].skus.data[0].price) / 100).toFixed(2) + ' | ' + products[pointer].description,
        'image_url': products[pointer].images[0],
        'actions': [
          {
            'name': 'did_choose_prize',
            'text': 'Yay, that\'s perfect!',
            'type': 'button',
            'style': 'primary',
            'value': pointer,
            'confirm': {
              'title': 'Confirm the Deets',
              'text': products[pointer].name + ' ($' + ((products[pointer].skus.data[0].price) / 100).toFixed(2) + ', plus $3.99 shipping) for immediate delivery to ' + recipientHandle + '.',
              'ok_text': 'Place Order',
              'dismiss_text': 'Cancel'
            }
          },
          {
            'name': 'choose_next_prize',
            'text': 'No, try again',
            'type': 'button',
            'value': pointer
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
  return getNextPrize
}

export default getNextPrizeMessageFromList
