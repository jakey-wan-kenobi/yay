/**
* Return a new prize from the list, and return it to the Slack user. This is for browsing different prize options to select the one you want, as well as sending the intiial first prize.
* @todo Handle the errors.
* @param {Number} index The current product we were showing. We should now return the next one.
* @param {String} recipientHandle The handle of the user we're sending this to. We need to pass it back in forth so we can keep stuffing it in the Slack message callback_id.
* @returns {Object} A Slack message object containing the next prize, ready to be sent back to the Slack user.
*/

import dotenv from 'dotenv'
dotenv.config()

import connectToStripe from 'stripe'
const stripe = connectToStripe(process.env.TEST_STRIPE_KEY)

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
      'text': '*Teehee ☺️. Let\'s find a prize for ' + recipientHandle + '*...', // products[pointer].bot_text,
      'attachments': [
        {
          // NOTE: The callback_id is the only chance we have to get data back from the message it's coming from. So we need to stuff the current product SKU and the recipient's handle into it. Then we need to parse it into two values and pass it back into this function every time. Using a SINGLE SPACE to separate these.
          'callback_id': products[pointer].skus.data[0].id + ' ' + recipientHandle,
          'pretext': products[pointer].metadata.bot_text || 'How about this one?',
          'fallback': 'Can\'t choose a prize.',
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
