/**
* Setup /account route. If someone navigates to this page and we don't have a JWT for them OR we didn't just get one from Slack (in the URL), send them to auth at Slack. Anytime a user navs to /account page, we check for their JWT (which is in the req.headers.cookie). If they have it, then we're good, and we know who they are. If they DON'T, we redirect them to the Sign in with Slack URL. Once they auth there, they're dropped back at /account with the new cookie (see /auth route below).
*/

import _decodeJWT from '../auth/_decodeJWT'
import express from 'express'

function setupAccountRoute (server) {
  server.use('/account', function (req, res, next) {
    const cookie = req.headers.cookie
    let authJWT = cookie ? req.headers.cookie.replace('access_token=', '') : null
    let decodedJWT = _decodeJWT(authJWT)
    // If not authed, redirect to Slack for sign on
    if (!decodedJWT) {
      res.redirect('https://slack.com/oauth/authorize?scope=identity.basic&client_id=104436581472.112407214276')
      return
    }
    next()
  })
  server.use('/account', express.static('../dist'))
}

export default setupAccountRoute
