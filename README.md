<img src="https://res.cloudinary.com/hintsy/image/upload/v1486932750/yay/unicorn_2x.png" alt="Unicorn" width="100">

# Yay! Prizes

#### An Open Source, Production Slack Bot Built with Node

<a href="http://standardjs.com/"><img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg" alt="Standard"></a>


### Hello There 👋

[Yay!](https://yay.hintsy.io/) is a unicorn that lets you send cool prizes to your friends, without ever leaving Slack. It was built by the team behind [Hintsy](https://hintsygifts.com). Despite that this is not a module or library or anything else that can be used in a project as a dependency, we decided to open source the codebase.

We hope this can be used by teams and developers as a reference for building

We did this for a bunch of different reasons. If you're curious, check out the blog post: LINK


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

#### Async/Await & Promises
We used this ES7 feature extensively throughout the app, and it was glorious. It opens up some pretty amazing capabilities, with a few caveats. Check out the repo for more details.

#### Directory Structure & Naming Conventions
We experimented with a very literal structure and naming conventions. Component files have names like `getOrderDetailsFromStripeID.js`. It might seem a bit overkill, but it was actually incredibly helpful as we built out and reused components across the app. I think I’m going to stick with naming conventions like these moving forward. It’s helpful that anyone with a rough understanding of the codebase can look at a component name and easily get what it’s used for.

#### Server Setup

Babel installation (reference page), Node, Nodemon, pm2,

Nodemon is great for development, but is definitely not stable enough for production use. Instead, we use pm2 for production, which is also more cumbersome to use for development. I think using both for the two use cases gives you the best of both worlds.

#### Deployment & Build Scripts
I don’t like to plunge tons of time into CI or automated deployment until I really need them. What we’ve done instead is implement some basic bash scripts into our npm build scripts, so that doing something like `npm run up` sends our built files to our server over ssh. If I were to improve from there, I'd also restart the server remotely. We're using pm2, and as it is now I ssh into the server and `pm2 restart server` to restart with the new build.

#### Firebase Database
Firebase is awesome for getting things scaffolded quickly. I highly recommend it for casual hacking, and I even in several production apps (like this one), though I likely would have used something like Postgres if I intended for this to be a larger effort.

#### Authentication
We use a combination of the Slack OAuth flow, combined with JSON Web Tokens, as our authentication system. No passwords. I wrote more about this flow in this Github repo.

#### Documentation & Commenting
I began using the JSDoc commenting style to mark up my components, even though I don’t plan to use the auto-documentation capabilities. I just wanted a consistent way to implement comments and inline documentation. I found this extremely helpful. I think it could even serve as an intermediary step to getting static typic setup in your codebase (because JSDoc asks you to define the types of all your function parameters, which invites you to think about it).

#### Analytics & Error Handling
Nothing special, but if anyone’s curious about deploying a monitoring/logging solution like Rollbar or Sentry, take a look. We also use Heap for analytics. Implementation is pretty simple, but command-F "Heap" if you're curious.

#### Email & SMS
We use Mailgun and Twilio (and I can't recommend either service highly enough).

#### Weak Areas
Just like any real life codebase, a few parts of it suck. One of those is unit tests. Didn’t write a single one. We could also dry up some error pages. Also, I use `require` instead of `import` in a few places where I totally spaced and couldn’t get it to work with `import`.

Also, response times from the Slack and Stripe APIs aren't always the best. Sometimes I can only turn a response around in about 400-500ms. If I were really worried about it, I'd implement redis for caching the products we're fetching (there's no need to fetch them from the Stripe API every time).

Finally, we could probably make the development and production environments more distinct, using enviornment variables to serve up different functionality. 


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
