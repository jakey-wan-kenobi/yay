import express from 'express'
import https from 'https'
import http from 'http'
import lex from './core/lex'
import 'babel-polyfill'

const app = express()

// Create website servers
http.createServer(lex.middleware(require('redirect-https')())).listen(80)
https.createServer(lex.httpsOptions, lex.middleware(app)).listen(443)

// NOTE: Strangeness here. Not sure why we have to serve each page and we can't use a *. Our 404 page won't actually get caught from the app, but from here. Strange.
app.use('/', express.static('../dist'))
app.use('/static', express.static(__dirname + '/../dist/static'))

import setupOrdersRoute from './site/orders'
setupOrdersRoute(app)

import setupAccountRoute from './site/account'
setupAccountRoute(app)

import setupAuthRoute from './site/auth'
setupAuthRoute(app)

// Create API server
let api = express()
https.createServer(lex.httpsOptions, lex.middleware(api)).listen(3000)

// Setup API routes. TODO: Break these out into a single function like 'setupAPI' or 'bootstrapAPI'
import setupYaySlashCommands from './api/yaySlashCommands'
setupYaySlashCommands(api)

import setupYayMessageButtons from './api/yayMessageButtons'
setupYayMessageButtons(api)

import setupSaveCreditCardRoute from './api/saveCreditCard'
setupSaveCreditCardRoute(api)

import setupAddShippingRoute from './api/addShippingAddress'
setupAddShippingRoute(api)

import setupCreditCardRoute from './api/creditCardDetails'
setupCreditCardRoute(api)

// Return our 404 page. This is a catchall for everything that didn't get caught above.
app.use('/', function (req, res, next) {
  res.status(404).send('Page Not Found')
})
