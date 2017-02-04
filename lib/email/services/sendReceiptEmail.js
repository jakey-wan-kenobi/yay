/**
* Send receipt email to purchaser.
*/

import dot from 'dot'
import fs from 'fs'

// Send the actual receipt email, using the name and email we retrieved from Slack TODO: Make this the real receipt email template
function sendReceiptEmail (name, email, last4, brand, order, mailgun) {
  fs.readFile('email-templates/yay-purchase-receipt.html', function (error, html) {
    // Catch error
    if (error) {
      // TODO: Handle error
      console.log(error)
      return
    }
    // Set up values.
    // const timestamp = order.created
    const recipient = order.metadata.recipient_handle
    let productDescription = null
    let productAmount = null
    let shippingAmount = null
    let totalAmount = (order.amount / 100).toFixed(2)
    // NOTE: The order items is an array because 'tax' and 'shipping' count as separate 'items'
    for (let i = 0; i < order.items.length; i++) {
      if (order.items[i].type === 'sku') {
        productDescription = order.items[i].description
        productAmount = (order.items[i].amount / 100).toFixed(2)
      }
      if (order.items[i].type === 'shipping') {
        shippingAmount = (order.items[i].amount / 100).toFixed(2)
      }
    }
    // Data object we're going to pass to the template compiler (to populate the email with)
    let emailData = {
      productDescription: productDescription,
      productAmount: productAmount,
      shippingAmount: shippingAmount,
      recipient: recipient,
      last4: last4,
      brand: brand,
      totalAmount: totalAmount
    }
    // Compile the email
    let templateFn = dot.template(html)
    let compiledTmp = templateFn(emailData)
    // Create the mailgun email object
    var emailObj = {
      from: 'Hintsy <no-reply@mail.hintsygifts.com>',
      // to: name + ' <' + email + '>',
      // TODO: Uncomment the above to send the actual recipient
      to: 'Jake Allen <jacobrobertallen@gmail.com>',
      subject: 'Your Yay prize is purchased! 👻',
      html: compiledTmp
    }
    // Send the mailgun email object
    mailgun.messages().send(emailObj, function (error, body) {
      if (body) {
        console.log('Receipt email sent')
      } else if (error) {
        console.log('Purchase receipt error:', error)
      }
    })
  })
}

export default sendReceiptEmail
