/**
* This sends text message alerts to admins when orders are placed.
* @param {String} price This is the price/amount of the purchase made (in cents, not dollars).
* @param {Number} product This is the product that was purchased.
*/

import captureException from '../core/captureException'
const accountSid = process.env.TWILIO_CLIENT_ID
const authToken = process.env.TWILIO_TOKEN
const twilio = require('twilio')(accountSid, authToken)
import dotenv from 'dotenv'
dotenv.config()

function sendTexts (price, product) {
  const numbers = [process.env.NUMBER_ONE, process.env.NUMBER_TWO]
  for (let i = 0; i < numbers.length; i++) {
    twilio.messages.create({
      body: '🦄 🎉 Prizes purchased! Schwing! Amount: $' + (price / 100) + ', Product: ' + product + '.',
      to: numbers[i],
      from: '+16504660280'
    }, function (err, message) {
      if (err) {
        captureException(err, 'Error sending Twilio text.', 549311)
        return
      }
      return
    })
  }
}

export default sendTexts
