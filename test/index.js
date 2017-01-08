/* eslint-env mocha */
import https from 'https'
import assert from 'assert'

import '../lib/server.js'

describe('HTTPS Server and Certificate', () => {
  it('should return 200', done => {
    https.get('https://198.199.108.52:443', res => {
      console.log('statuscode', res.statusCode)
      assert.equal(200, res.statusCode)
      done()
    })
  })
})
