/**
* Send receipt email to purchaser.
*/

// Send the actual receipt email, using the name and email we retrieved from Slack TODO: Make this the real receipt email template
function sendReceiptEmail (name, email, mailgun) {
  // Create the mailgun email object
  var emailObj = {
    from: 'Hintsy <no-reply@mail.hintsygifts.com>',
    to: name + ' <' + email + '>',
    subject: 'Your Yay Prize is Purchased!',
    html: 'Purchase was made!'
  }
  // Send the mailgun email object TODO: Actually send a link to request the user's email address
  mailgun.messages().send(emailObj, function (error, body) {
    if (body) {
      console.log('success')
    } else if (error) {
      console.log('receipt error:', error)
    }
  })
}

export default sendReceiptEmail
