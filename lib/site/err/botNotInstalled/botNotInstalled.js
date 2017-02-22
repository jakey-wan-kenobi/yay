/**
* Serve up the "Bot Not Installed" page, meaning that a user is trying to sign in without having added Yay to their Slack team.
*/

import path from 'path'

function setupBotNotInstalledRoute (server) {
  server.use('/err/bot_not_installed', function (req, res, next) {
    res.sendFile(path.join(__dirname, '/index.html'))
  })
}

export default setupBotNotInstalledRoute
