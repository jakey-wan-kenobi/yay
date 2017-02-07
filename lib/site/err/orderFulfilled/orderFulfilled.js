/**
* Serve up the "Order Fulfilled" page, meaning that a user is trying to add a shipping address for an order that already has one set.
*/

import path from 'path'
const heap = require('heap-api')(process.env.HEAP_CLIENT_ID)

function setupOrderFulfilledRoute (server) {
  server.use('/err/order_fulfilled', function (req, res, next) {
    res.sendFile(path.join(__dirname, '/index.html'))
    heap.track('Order Fulfilled Page View')
  })
}

export default setupOrderFulfilledRoute
