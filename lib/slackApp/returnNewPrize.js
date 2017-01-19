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

import getNextPrizeMessageFromList from '../slackApp/getNextPrizeMessageFromList'

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
      let returnThisPrize = getNextPrizeMessageFromList(products, index, recipientHandle)
      resolve(returnThisPrize)
      return returnThisPrize
    }).catch(function (err) {
      // TODO: Handle error
      console.log(err)
    })
  })
}

export default returnNewPrize
