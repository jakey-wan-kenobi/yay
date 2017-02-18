/**
* Serve a 404 page.
*/

import path from 'path'

function setup404 (server) {
  // Return our 404 page. This is a catchall for everything that didn't get caught.
  server.use('/', function (req, res, next) {
    res.status(404).sendFile(path.join(__dirname, '/index.html'))
  })
}

export default setup404
