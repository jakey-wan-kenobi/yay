/**
* Save a website user to mailing list.
*
* @todo I'm not really verifying that the method succeeded. So conveivably sometimes this will fail and the user will stil think it succeeded.
*/

import bodyParser from 'body-parser'
import addUserToEmailList from '../email/addUserToEmailList'

function setupAddMailingListRoute (server) {
  server.use(bodyParser.urlencoded({ extended: false }))
  server.route('/save-email-address')
  .all(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', 'https://yay.hintsy.io')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Origin, Accept, Bearer')
    next()
  })
  // This options route is required for the preflight done by the browser
  .options(function (req, res, next) {
    res.status(200).end()
    // next()
  })
  .post(function (req, res, next) {
    if (!req.body.email) {
      res.sendStatus(400)
      return
    }
    addUserToEmailList(req.body.email, undefined, undefined, undefined, true)
    res.sendStatus(200)
  })
}

export default setupAddMailingListRoute
