/**
* Serve up the "Order Not Found" page, meaning that a user tried to go to the orders page with an invalid order id.
*/

import path from 'path'
const heap = require('heap-api')(process.env.HEAP_CLIENT_ID)

function setupOrderNotFoundRoute (server) {
  server.use('/err/order_not_found', function (req, res, next) {
    res.sendFile(path.join(__dirname, '/index.html'))
    heap.track('Order Not Found Page View')
  })
}

export default setupOrderNotFoundRoute
