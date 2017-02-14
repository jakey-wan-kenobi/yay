/**
* Get a specific cookie, passing in the name of the cookie as the param.
* @param {String} name The name of the cookie you're trying to parse off of the cookie string.
*/

function getCookie (cookieString, cookieName) {
  let value = '; ' + cookieString
  let parts = value.split('; ' + cookieName + '=')
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
}

export default getCookie
