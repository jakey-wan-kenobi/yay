/**
* Set up Firebase database and admin access.
* @returns A Firebase database instance.
*/

import admin from 'firebase-admin'

admin.initializeApp({
  // TODO: Scope this admin's permissions down to the bare minimum
  credential: admin.credential.cert('./yay-app-12359-firebase-adminsdk-dsrhf-f7ffb3cda0.json'),
  databaseURL: 'https://yay-app-12359.firebaseio.com'
})

const db = admin.database()

export default db
