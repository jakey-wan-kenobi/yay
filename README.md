
### Thoughts

**Why is 'request' still a dependency? We're failing without it, but don't seem to use it anywhere?**


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

Server IP: 198.199.108.52

{
  "code": "104436581472.112364873907.437fe70d73",
  "state": ""
}

Super helpful: https://99designs.com/tech-blog/blog/2015/08/26/add-to-slack-button/

TODO: Remember to set up rules for server access to Firebase data: https://firebase.google.com/docs/database/admin/start

Slackbot node library. Got this working but decided I don't really need it: https://github.com/mishk0/slack-bot-api

Notes: It seems that the whole Real Time Messaging thing is probably overkill. Why don't we just add /creditcard and /account commands, and then the first message explains all this and prompts them to set up? Rather than listening on every channel? Or do we really need a bot who can interact and so forth? Perhaps he at least says something whenever his name is mentioned?
