/**
* Capture exceptions and pass them to Sentry.
* @param {Object} error The error Object
* @param {String} description Plain description of the error.
* @param {Number} id A unique id for this error
*/

import raven from 'raven'

function captureException (error, description, id) {
  raven.captureException(error, {
    extra: {
      description: description,
      id: id
    }
  })
}

export default captureException
