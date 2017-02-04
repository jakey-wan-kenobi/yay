/**
* Send receipt email to purchaser.
*/

// Send the actual receipt email, using the name and email we retrieved from Slack TODO: Make this the real receipt email template
function sendReceiptEmail (name, email, last4, brand, order, mailgun) {
  // const timestamp = order.created
  const recipient = order.metadata.recipient_handle
  let productDescription = null
  let productAmount = null
  let shippingAmount = null
  // NOTE: The order items is an array because 'tax' and 'shipping' count as separate 'items'
  for (let i = 0; i < order.items.length; i++) {
    if (order.items[i].type === 'sku') {
      productDescription = order.items[i].description
      productAmount = '$' + (order.items[i].amount / 100).toFixed(2)
    }
    if (order.items[i].type === 'shipping') {
      shippingAmount = '$' + (order.items[i].amount / 100).toFixed(2)
    }
  }
  // Create the mailgun email object
  var emailObj = {
    from: 'Hintsy <no-reply@mail.hintsygifts.com>',
    to: name + ' <' + email + '>',
    subject: 'Your Yay Prize is Purchased!',
    html: 'Purchase was made! 6 values: ' + productDescription + ' ' + productAmount + ' ' + shippingAmount + ' ' + recipient + ' ' + last4 + ' ' + brand
  }
  // Send the mailgun email object TODO: Actually send a link to request the user's email address
  mailgun.messages().send(emailObj, function (error, body) {
    if (body) {
      console.log('Receipt email sent')
    } else if (error) {
      console.log('receipt error:', error)
    }
  })
}

export default sendReceiptEmail
