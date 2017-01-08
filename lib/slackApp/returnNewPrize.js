/* *******************************************
    METHOD: RETURN NEW PRIZE
*********************************************/
require('dotenv').config() // Adds env variables from process.env to "process.env" object
let stripe = require('stripe')(process.env.TEST_STRIPE_KEY)

function returnNewPrize (index, recipientHandle) {
  // Retrieve products from Stripe Relay, returning a promise
  const _getProducts = function () {
    return new Promise(function (resolve, reject) {
      stripe.products.list(function (err, products) {
        if (err) {
          // TODO: Handle error
          // console.log('error', err)
          reject(err)
        }
        resolve(products.data)
        return products.data
      })
    })
  }

  // Return a promise that resolves with the new gift. This can be sent back to Slack via res.send(val)
  return new Promise(function (resolve, reject) {
    _getProducts().then(function (products) {
      let returnThisPrize = _returnNewPrizeFromList(products, index)
      resolve(returnThisPrize)
      return returnThisPrize
    }).catch(function (err) {
      // TODO: Handle error
      console.log(err)
    })
  })

  // Select the next gift from the returned list of products, based on the index we are passed from Slack button
  function _returnNewPrizeFromList (products, index) {
    // Use the index to know which product to return
    let pointer = parseInt(index, 10) || 0
    pointer++

    // If we've reached the end of the products, start over at 0.
    if (!products[pointer]) {
      pointer = 0
    }

    const getNextPrize = {
      'text': 'Teehee ☺️. Let\'s find a prize for *' + recipientHandle + '*...', // products[pointer].bot_text,
      'attachments': [
        {
          // NOTE: The callback_id is the only chance we have to get data back from the message it's coming from. So we need to stuff the current product SKU and the recipient's handle into it. Then we need to parse it into two values and pass it back into this function every time. Using a SINGLE SPACE to separate these.
          'callback_id': products[pointer].skus.data[0].id + ' ' + recipientHandle,
          'pretext': products[pointer].metadata.bot_text || 'How about this one?',
          'fallback': 'Required plain-text summary of the attachment.',
          'color': '#59FFBA',
          'title': products[pointer].name + ' by ' + products[pointer].metadata.brand,
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
                'text': products[pointer].name + ' ($' + ((products[pointer].skus.data[0].price) / 100).toFixed(2) + ') for immediate delivery to ' + recipientHandle + '.',
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
}

export default returnNewPrize
