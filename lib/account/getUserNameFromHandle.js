// Take '@jake' and returns 'jake'
function getUserNameFromHandle (text) {
  const recipient = text
  const pattern = /\B@[a-z0-9_-]+/gi
  const userName = recipient.match(pattern)
  if (!userName) {
    return false
  }
  return userName[0]
  // return userName[0].substr(1) // This removes the '@' symbol, but I decided to keep it
}

export default getUserNameFromHandle
