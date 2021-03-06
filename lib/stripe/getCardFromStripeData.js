/**
* Get default credit card details from the Stripe customer data object.
* @param {Object} stripeData Stripe customer data object.
* @returns {Object} An object with child properties last4 and brand of the customer's default payment source.
*/

function getCardFromStripeData (stripeData) {
  const cardList = stripeData.sources.data
  let dataToSend = null
  for (let i = 0; i < cardList.length; i++) {
    // Since there may be multiple sources, we need to grab the default source from the array of possible sources (stripe always returns an array of sources).
    if (cardList[i].id === stripeData.default_source) {
      const card = cardList[i]
      // Cherry pick what data we want to return (we don't want all of it)
      dataToSend = {
        last4: card.last4,
        brand: card.brand
      }
      // Send this back to the client
      return dataToSend
    }
  }
  return dataToSend
}

export default getCardFromStripeData
