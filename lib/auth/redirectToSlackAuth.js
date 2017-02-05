/**
* User attempts to do something that only authed users can do, so redirect them to auth page. Be sure to combine this with a 'return'.
* @param {Object} res The express res object, so that we can redirect user.
*/

function redirectToAuthPage (res) {
  res.status(401).redirect('https://slack.com/oauth/authorize?scope=identity.basic&client_id=104436581472.112407214276')
}

export default redirectToAuthPage
