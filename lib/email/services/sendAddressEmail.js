/**
* Send the request for shipping address email to the recipient.
*/

import dot from 'dot'
import fs from 'fs'
import captureException from '../../core/captureException'

// Send the actual address email, using the name and email we retrieved from Slack
function sendAddressEmail (name, email, orderID, mailgun) {
  fs.readFile('email-templates/yay-shipping-address.html', function (error, html) {
    // Error handler
    if (error) {
      captureException(error, 'Could not read file yay-shipping-address.html.', 102240)
      return
    }
    // Data object we're going to pass to the template compiler (to populate the email with)
    let emailData = {
      name: name,
      email: email,
      orderID: orderID
    }
    // Compile the email
    let templateFn = dot.template(html)
    let compiledTmp = templateFn(emailData)
    // Create the mailgun email object
    var emailObj = {
      from: 'Hintsy <no-reply@mail.hintsygifts.com>',
      to: name + ' <' + email + '>',
      subject: 'You get a prize! 🎉 🙌 🦄 ',
      html: compiledTmp
    }
    // Send the mailgun email object
    mailgun.messages().send(emailObj, function (error, body) {
      // Error handler
      if (error) {
        captureException(error, 'Failed to send address request email.', 218843)
      }
    })
  })
}

export default sendAddressEmail
