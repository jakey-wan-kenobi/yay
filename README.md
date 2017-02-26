<img src="https://res.cloudinary.com/hintsy/image/upload/v1486932750/yay/unicorn_2x.png" alt="Unicorn" width="100">

# Yay! Prizes

#### An Open Source, Production Slack Bot Built with Node

<a href="http://standardjs.com/"><img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg" alt="Standard"></a>


### Hello There 👋

[Yay!](https://yay.hintsy.io/) is a unicorn that lets you send cool prizes to your friends, without ever leaving Slack. It was built by the team behind [Hintsy](https://hintsygifts.com). We decided to open source the codebase, for a few reasons:

First, almost all of the tools we used to build it are open source , so why not give back to the community?

Second, Slack bots are relatively new, and there isn't a ton of information out there on how to build them. The more the merrier.

Third, the business risk of exposing code is, in our case, fairly minimal. Nothing sensitive is contained in the repo (nor should it ever be, really—even private Github repos should not be considered secure). We don't actually store any sensitive data anywhere, really. We believe it's safe to assume that anything done on a server can pretty much be exposed by the client—thinking your code is secure because it's in a repo is


#### Table of Contents

1. Setting up the server
2. Deployment setup
3. directory structure & components
4. Database
5. Authentication
6. Async/Await
7. Documentation & Commenting
8.

#### Working with the Slack API

The [Slack API docs](https://api.slack.com/) are excellent. I won't repeat anything that they cover here, but I will mention a little gotchas that aren't directly mentioned in the docs.

###### Permissions & Scopes

This aspect of the API could use some improvement. Slack has implemented some extremely granular [permissions and scopes](https://api.slack.com/docs/oauth-scopes) so that apps request only the absolute minimum of permissions that they need to function. This is good. But it's also a pain to work with and understand.

One huge caveat to understand: if you're installing a bot, a ton of permissions come along with that bot. You don't need to add specific scopes and permission covered by the "bot" permission (they overlap). You can see all default bot permisions [here](https://api.slack.com/bot-users).

Note: if you're using a permission that comes along with your "bot" permissions, *you need to use the bot's access token*. If you're using a permission that you've specifically requested, *you need to use the general access token*.

###### "Sign in with Slack" and "Add to Slack"




#### Server Setup

Babel installation (reference page), Node, Nodemon, pm2,

#### Deployment Setup

#### Firebase Database

#### Authentication


#### Documentation & Commenting

#### Analytics & Error Handling

#### Email & SMS

----

### Appendix

##### Things to Be Done

- Unit tests
- e2e tests
- Better deployment automation
- Dev and production environments, better distinction
- Caching (responses could be faster)

##### Further reading:

- [The Slack docs](https://api.slack.com/) are excellent
- [The Slack OAuth flow](https://99designs.com/tech-blog/blog/2015/08/26/add-to-slack-button/)

##### A list of all tools referenced:

- Node
- Digital Ocean
- Nodemon
- pm2
- Babel
- Async/await
- Mailgun
- Twilio
- Firebase
- Redis
-


















---

#### `npm run up` will upload files from local yay directory to /home/yay

This allows you to...

1. Run `nodemon server.js` on the server
2. Make your changes locally and save them
3. Go into local terminal and run `npm run up`
4. Watch the server restart on the remote (live) server

So now there's no need to sync local and remote scripts by copy/pasting. Next step would be to auto-upload the changes on save (either a watch script, or with something like save-commands for atom editor), so we run the `npm run up` command on save.


**Process for Deploying to Remote Server**
1. Clone bare repo on the server itself (so it's just .git file sitting in there)
2. Then create a script that literally just checks out the repo into the folder you want it to be in


**We're going to need our own authentication system.** We can use Slack/OAuth to allow Yay to access Slack information. But how do we identify our users when the requests aren't coming directly from Slack, with the relevant tokens included? For example, how do we log them in at yay.hintsy.io and allow them to change their credit card or address?

I think the best process is:
1. User clicks 'Sign in with Slack'
2. Slack authorizes the user, returning a code, which we exchange for an accses_token
3. We save this access_token and relevant user/team info to Firebase.
4. We use the access_token(?) to create a signed JWT, and send that to browser in a cookie. Redirect user to account page.
5. Then we use the JWT to lookup the corresponding team (decoding it to query by access_token). We should then indexOn access_token for performance.

Note that since this is the case, we might as well use Mongo rather than Firebase.

### How to generate a random key to use for JWT secret:

`node -e "console.log(require('crypto').randomBytes(256).toString('base64'));"`

This generate a random base64 string that's super long.


*Notes:*

Super helpful: https://99designs.com/tech-blog/blog/2015/08/26/add-to-slack-button/

Slackbot node library. Got this working but decided I don't really need it: https://github.com/mishk0/slack-bot-api
