/**
* Serve up the "Order Not Found" page, meaning that a user tried to go to the orders page with an invalid order id.
*/

import path from 'path'

function setupOrderNotFoundRoute (server) {
  server.use('/err/order_not_found', function (req, res, next) {
    res.sendFile(path.join(__dirname, '/index.html'))
  })
}

export default setupOrderNotFoundRoute
