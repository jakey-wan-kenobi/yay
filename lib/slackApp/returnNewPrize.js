/**
* Return a new prize from the list, and return it to the Slack user. This is for browsing different prize options to select the one you want, as well as sending the intiial first prize.
* @todo Handle the errors.
* @param {Number} index The current product we were showing. We should now return the next one.
* @param {String} recipientHandle The handle of the user we're sending this to. We need to pass it back in forth so we can keep stuffing it in the Slack message callback_id.
* @returns {Object} A Slack message object containing the next prize, ready to be sent back to the Slack user.
*/

import dotenv from 'dotenv'
dotenv.config()
import captureException from '../core/captureException'
import buildPrizeMessage from '../slackApp/buildPrizeMessage'
import getProductsFromStripe from '../stripe/getProductsFromStripe'
import getNextAvailableProductIndex from '../slackApp/getNextAvailableProductIndex'

function returnNewPrize (index, recipientHandle) {
  // NOTE: This thing took 5 seconds during a timeout. What took so long?
  console.log('🦄 Start return new prize.')
  console.time('return_new_prize')
  // Return a promise that resolves with the new gift. This can be sent back to Slack via res.send(val)
  return new Promise(function (resolve, reject) {
    (async function () {
      // 1. Get our products from Stripe
      console.time('get_products_from_stripe')
      const products = await getProductsFromStripe()
      console.timeEnd('get_products_from_stripe')
      // 2. Use the pointer to grab the next available product from the list (checking for skus as well)
      console.time('get_next_product_from_list')
      const nextAvailableProductIndex = await getNextAvailableProductIndex(products, index)
      console.timeEnd('get_next_product_from_list')
      // 3. Compile this next product with the prize Slack message so we can send it back
      console.time('build_slack_message')
      const finalPrizeMessage = await buildPrizeMessage(products, nextAvailableProductIndex, recipientHandle)
      console.timeEnd('build_slack_message')
      console.timeEnd('return_new_prize')
      resolve(finalPrizeMessage)
    })().catch(function (err) {
      captureException(err, 'Error getting products from Stripe.', 375521)
    })
  })
}

export default returnNewPrize
