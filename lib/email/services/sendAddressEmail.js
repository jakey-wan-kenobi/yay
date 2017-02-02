/**
* Send the request for shipping address email to the recipient.
*/

import dot from 'dot'
import fs from 'querystring'

// Send the actual address email, using the name and email we retrieved from Slack
function sendAddressEmail (name, email, orderID, mailgun) {
  fs.readFile('email-templates/yay-shipping-address.html', function (error, html) {
    // Catch error
    if (error) {
      // TODO: Handle error
      console.log(error)
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
      // to: name + ' <' + email + '>',
      // TODO: Uncomment the above to send the actual recipient
      to: 'Jake Allen <jacobrobertallen@gmail.com>',
      subject: 'You get a prize! 🎉 🙌 🦄  Let us know where to ship it.',
      html: compiledTmp
    }
    // Send the mailgun email object
    mailgun.messages().send(emailObj, function (error, body) {
      if (body) {
        console.log('success')
      } else if (error) {
        console.log('Shipping address error:', error)
      }
    })
  })
}

export default sendAddressEmail
