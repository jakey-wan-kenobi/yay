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
raven.config(process.env.RAVEN_SECRET).install()
import heap from 'heap-api'
heap(process.env.HEAP_CLIENT_ID)

// Create website servers
http.createServer(lex.middleware(require('redirect-https')())).listen(80)
https.createServer(lex.httpsOptions, lex.middleware(app)).listen(443)
// NOTE: Strangeness here. Not sure why we have to serve each page and we can't use a *. Our 404 page won't actually get caught from the app, but from here. Strange.
import path from 'path'
app.use('/', express.static('../dist'))
app.use('/static', express.static(path.join(__dirname, '/../dist/static')))
app.use('/about', express.static('../dist'))
app.use('/privacy', express.static('../dist'))

import setupOrdersRoute from './site/orders'
setupOrdersRoute(app)

import setupAccountRoute from './site/account'
setupAccountRoute(app)

import setupAuthRoute from './site/auth'
setupAuthRoute(app)

import setupOrderFulfilledRoute from './site/err/orderFulfilled/orderFulfilled'
setupOrderFulfilledRoute(app)

import setupOrderNotFoundRoute from './site/err/orderNotFound/orderNotFound'
setupOrderNotFoundRoute(app)

import setupBotNotInstalledRoute from './site/err/botNotInstalled/botNotInstalled'
setupBotNotInstalledRoute(app)

import setup404 from './site/err/404/404'
setup404(app)

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

import setupUpdateCardSettingsRoute from './api/updateCardSettings'
setupUpdateCardSettingsRoute(api)

import setupAddMailingListRoute from './api/saveUserToMailingList'
setupAddMailingListRoute(api)
