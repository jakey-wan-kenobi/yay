import express from 'express'
import https from 'https'
import http from 'http'
import lex from './core/lex'
import 'babel-polyfill'

const app = express()

// Set up global, automatic exception and error handler for Sentry.io
import dotenv from 'dotenv'
dotenv.config()
import raven from 'raven'
raven.config(process.env.RAVEN_SECRET, {
  autoBreadcrumbs: {
    'console': false,
    'http': true
  }
}).install()

import path from 'path'
import setupOrdersRoute from './site/orders'
import setupAccountRoute from './site/account'
import setupAuthRoute from './site/auth'
import setupOrderFulfilledRoute from './site/err/orderFulfilled/orderFulfilled'
import setupOrderNotFoundRoute from './site/err/orderNotFound/orderNotFound'
import setup404 from './site/err/404/404'
import setupYaySlashCommands from './api/yaySlashCommands'
import setupYayMessageButtons from './api/yayMessageButtons'
import setupSaveCreditCardRoute from './api/saveCreditCard'
import setupAddShippingRoute from './api/addShippingAddress'
import setupCreditCardRoute from './api/creditCardDetails'
import setupUpdateCardSettingsRoute from './api/updateCardSettings'

raven.context(function () {
  // Create website servers
  http.createServer(lex.middleware(require('redirect-https')())).listen(80)
  https.createServer(lex.httpsOptions, lex.middleware(app)).listen(443)

  // NOTE: Strangeness here. Not sure why we have to serve each page and we can't use a *. Strange.
  app.use('/', express.static('../dist'))
  app.use('/static', express.static(path.join(__dirname, '/../dist/static')))

  setupOrdersRoute(app)

  setupAccountRoute(app)

  setupAuthRoute(app)

  setupOrderFulfilledRoute(app)

  setupOrderNotFoundRoute(app)

  setup404(app)

  // Create API server
  let api = express()
  https.createServer(lex.httpsOptions, lex.middleware(api)).listen(3000)

  // Setup API routes.
  setupYaySlashCommands(api)

  setupYayMessageButtons(api)

  setupSaveCreditCardRoute(api)

  setupAddShippingRoute(api)

  setupCreditCardRoute(api)

  setupUpdateCardSettingsRoute(api)
})
