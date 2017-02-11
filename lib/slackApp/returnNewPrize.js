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
  // Return a promise that resolves with the new gift. This can be sent back to Slack via res.send(val)
  return new Promise(function (resolve, reject) {
    (async function () {
      // 1. Get our products from Stripe
      const products = await getProductsFromStripe()
      // 2. Use the pointer to grab the next available product from the list (checking for skus as well)
      const nextAvailableProductIndex = await getNextAvailableProductIndex(products, index)
      // 3. Compile this next product with the prize Slack message so we can send it back
      const finalPrizeMessage = await buildPrizeMessage(products, nextAvailableProductIndex, recipientHandle)
      resolve(finalPrizeMessage)
    })().catch(function (err) {
      captureException(err, 'Error getting products from Stripe.', 375521)
    })
  })
}

export default returnNewPrize
