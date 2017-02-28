<img src="https://res.cloudinary.com/hintsy/image/upload/v1486932750/yay/unicorn_2x.png" alt="Unicorn" width="100">

# Yay! Prizes

#### An Open Source Slack Bot Built with Node

<a href="http://standardjs.com/"><img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg" alt="Standard"></a>


## Hello There 👋

[Yay!](https://yay.hintsy.io/) is a unicorn that lets you send cool prizes to your friends, without ever leaving Slack. On the surface it’s a toy, but underneath it’s a team and culture building tool (and a toy). It was built by the team behind [Hintsy](https://hintsygifts.com). We’re open sourcing the codebase, even though it’s not a module or library or anything else that can be used in your projects as a dependency. We did this in hopes that it's useful for developers building on the Slack API (or creating Node backends in general).

If you're curious, we wrote more about it on [Medium](LINK).

Below you'll find a few notes and pointers for building on the Slack API, along with a brief overview of all the things in this repo that may be interesting to developers looking for inspiration.

#### Table of Contents

```
1.Working with the Slack API
2. About This App
  a. Async/Await with Babel
  b. Directory Structure & Naming conventions
  c. Server & Development Environment
  d. Deployment & Build scripts
  e. Firebase Database
  f. Authentication
  g. Documentation & Commenting
  h. Analytics & Error Handling
  i. Environment Variables
  j. Email & SMS
  k. Room for Improvement
3. Appendix
  a. Helpful References
  b. List of Tools Used
```

# Working with the Slack API
Working with the Slack API is a breeze, but we wrote a [Medium](LINK) post that details a few pointers and gotchas we discovered as we built out our bot. Take a look before you get started building, it might save you a few headaches.

# About This App
##### A few areas that might be of general interest to developers. I review them all in detail in the Github repo, but I’ll list them out below.

### Async/Await & Promises
We used async/await, an ES7 feature, extensively throughout the app. It was glorious. It opens up some pretty awesome capabilities. We used it in combination with `axios`, a promise-based HTTP library. This allows you to do things like build a component that returns a POST request made with axios (thereby returning a promise), then `await`ing that component in an async function. (Every promise can be `await`ed inside an async function).

If you have multiple requests to make, you can string them together very easily this way.

As an example, check out `site/auth.js`, where we await a variety of requests (like `account/exchangeSlackCodeForToken`, for example). This flow is really interesting. It allows you to build out components, then string them together consecutively. It's very easy to understand, and is ridiculously easy compared with callbacks and working directly with promises. Your async function becomes a kind of "runway" for your business logic, which is all neatly contained elsewhere. You just have to make sure your components are returning promises rather than the direct values themselves.

And remember, you don't have to use a library like `axios` either. You can just create a promise in your components and return it. Check out `account/getSlackTokenFromTeamID`, for example, where it starts with `return new Promise(function (resolve, reject)...)`.

Also, make absolute sure you aren't `awaiting` when you don't actually have to. Sometimes you need to `await` 2 or more values, but they don't need to await each other to execute. You want all of your processes to run as soon as the new data is available to them. To get around instances like this, you can call all your ready-to-execute, promise-returning functions simultaneously, and then await them later on. For example, check out `api/creditCardDetails.js`, on line 33, where I want to make 2 requests and then check which one exists to move forward. What I *don't* want to do is make one request, wait till it finishes to see if it exists, and then make my second requst if it doesn't. This would double our time spent waiting for requests.


### Directory Structure & Naming Conventions
We experimented with a very literal structure and naming conventions. Component files have names like `getOrderDetailsFromStripeID.js`. It might seem a bit overkill, but it was actually incredibly helpful as we built out and reused components across the app. I think I’m going to stick with naming conventions like these moving forward. It’s helpful that anyone with a rough understanding of the codebase can look at a component name and easily get what it’s used for.

### Server Setup

Babel installation (reference page), Node, Nodemon, pm2,

We built it in Node, with Babel and Express (and like 25 other dependencies, of course).

Nodemon is great for development, but is definitely not stable enough for production use. Instead, we use pm2 for production, which is also more cumbersome to use for development. I think using both for the two use cases gives you the best of both worlds.

### Deployment & Build Scripts
I don’t like to plunge tons of time into CI or automated deployment until I really need them. What we’ve done instead is implement some basic bash scripts into our npm build scripts, so that doing something like `npm run up` sends our built files to our server over ssh. If I were to improve from there, I'd also restart the server remotely. We're using pm2, and as it is now I ssh into the server and `pm2 restart server` to restart with the new build.

Check the `package.json`, specicially the `up` process. Running `npm run up` will send all the files in our repo to our server.

### Firebase Database
Firebase is awesome for getting things scaffolded quickly. I highly recommend it for casual hacking, and I even in several production apps (like this one), though I likely would have used something like Postgres if I intended for this to be a larger effort.

In this case, our `account/database.js` component creates our database instance, and we pass it around to the entire app by importing the module.

### Authentication
We use the Slack OAuth flow, combined with JSON Web Tokens (JWTs), as our authentication system. No passwords. I wrote more about the flow [here](LINK). To summarize: user clicks the Sign In button => user is sent to Slack => user authorizes the app => user is sent back to Yay along with a payload that identifies them => we verify that payload, create a JWT, and send it back to the browser for them. Now they’re logged in.

Check out the `auth` directory, along with the `site/auth.js` component to learn how this works.

### Documentation & Commenting
I began using the JSDoc commenting style to mark up my components, even though I don’t plan to use the auto-documentation capabilities. I just wanted a consistent way to implement comments and inline documentation. I found this extremely helpful. I think it could even serve as an intermediary step to getting static typic setup in your codebase (because JSDoc asks you to define the types of all your function parameters, which invites you to think about it).

Take a look at nearly any component, at the top of the page, to see what I'm referring to.

### Analytics & Error Handling
Nothing special, but if anyone’s curious about deploying a monitoring/logging solution like Rollbar or Sentry, take a look. We also use Heap for analytics. Implementation is pretty simple, but command-F "Heap" if you're curious.

See `core/captureException.js` for exception handling. The Heap tracking details are sprinkled throughout.

### Environment Variables
It sounds obvious, but it’s not. I’ve seen real life codebases that support tons of users, with all kinds of API secrets and tokens sprinkled throughout the code. Use environment variables. Do it.

We used [dotenv for Node](https://github.com/motdotla/dotenv), which allows you to insert `process.env.VALUE`, where `VALUE=hereismyvalue` is contained as a line in your `.env` file (which you of course don't commit to your repo).

### Email & SMS
We use Mailgun and Twilio (and both services are excellent). We also use the [dot templating engine](http://olado.github.io/doT/index.html), which is really fast and straightforward. Twilio is for sending alerts to admins when prizes are purchased.

See `email/sendPurchaseEmails.js` and `twilio/sendTexts` for details.

### Weak Areas
Just like any real life codebase, a few parts of it suck. One of those is unit tests. We didn’t write a single one. We could also dry up some error pages. Also, I use `require` instead of `import` in a few places where I totally spaced and couldn’t get it to work with `import`.

Also, response times from the Slack and Stripe APIs aren't always the best. Sometimes I can only turn a response around in about 400-500ms. If I were really worried about it, I'd implement Redis for caching the products we're fetching (there's no need to fetch them from the Stripe API every time).

Finally, we could probably make the development and production environments more distinct, using environment variables to serve up different functionality.


----

# Appendix

## Helpful References & Docs:

- [The Slack docs](https://api.slack.com/) are excellent
- [The Slack OAuth flow](https://99designs.com/tech-blog/blog/2015/08/26/add-to-slack-button/)

## List of Tools Used:

- Node
- Digital Ocean
- Nodemon
- pm2
- Babel
- Async/await
- Mailgun
- Twilio
- Firebase
