/**
* Takes a user's name and email address and adds them to the Yay mailing list.
* @param {String} email This is the email address we're adding.
* @param {String} name This is the name of the user we're adding (if available).
* @param {String} teamID This is the id of the Slack team. Optional.
* @param {String} userID The Slack user's user id. Optional.
*/

import dotenv from 'dotenv'
dotenv.config()

import connectToMailgun from 'mailgun-js'
const mailgun = connectToMailgun({apiKey: process.env.MAILGUN_KEY, domain: 'mail.hintsygifts.com'})

import captureException from '../core/captureException'

function addUserToEmailList (email, name, teamID, userID) {
  const list = mailgun.lists('yay_newsletter@mail.hintsy.io')
  const newUser = {
    subscribed: true,
    address: email,
    name: name,
    vars: {
      team_id: teamID,
      user_id: userID
    }
  }
  list.members().create(newUser, function (err, data) {
    if (err) captureException(err, 'Error saving new user to mailing list.', 297958)
    return
  })
}

export default addUserToEmailList
