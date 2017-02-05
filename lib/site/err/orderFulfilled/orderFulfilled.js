/**
* Serve up the "Order Fulfilled" page, meaning that a user is trying to add a shipping address for an order that already has one set.
*/

import path from 'path'

function setupOrderFulfilledRoute (server) {
  server.use('/err/order_fulfilled', function (req, res, next) {
    res.sendFile(path.join(__dirname, '/index.html'))
  })
}

export default setupOrderFulfilledRoute
