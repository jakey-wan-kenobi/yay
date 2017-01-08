'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getUserNameFromHandle = require('./account/getUserNameFromHandle');

var _getUserNameFromHandle2 = _interopRequireDefault(_getUserNameFromHandle);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* *******************************************
    METHOD: PURCHASE THIS PRIZE
*********************************************/
require('dotenv').config(); // Adds env variables from process.env to "process.env" object
var stripe = require('stripe')(process.env.TEST_STRIPE_KEY);

function purchaseThisPrize(callback_id, team_id, purchaser, db) {
  // Return a promise that resolves with the new gift. This can be sent back to Slack via res.send(val)
  return new Promise(function (resolve, reject) {
    // Lookup "stripe_id" from Firebase using "team_id", in order to pass to purchase function
    var accounts = db.ref('/slack_accounts_users/' + team_id + '/' + purchaser.id);
    var stripe_id = '';
    accounts.once('value').then(function (snapshot) {
      stripe_id = snapshot.child('stripe_id').val();
      if (!stripe_id) {
        // TODO: Handle no credit card
        // console.log('no credit card')
        reject('missing_credit_card');
        return false;
      }
      // Place the order using the sku and stripe_id
      var sku = _parseSkuFromCallback(callback_id);
      var recipientHandle = (0, _getUserNameFromHandle2.default)(callback_id);
      stripe.orders.create({
        currency: 'usd',
        customer: stripe_id,
        metadata: {
          purchaser_id: purchaser.id,
          purchaser_name: purchaser.name,
          recipient_handle: recipientHandle,
          team_id: team_id
          // recipient_name: recipient.name,
          // recipient_id: recipient.id
        },
        items: [{
          type: 'sku',
          parent: sku
        }],
        // NOTE: This is placeholder becuase it's required by stripe API. We're going to email the user to get this info directly, after the purchase.
        shipping: {
          name: 'Placeholder Name',
          address: {
            line1: 'Placeholder Street'
          }
        }
      }, function (err, order) {
        if (err) {
          reject(err);
          return err;
        }
        resolve(order);
        return order;
      });
    });
  });
}

// Parse the user name off the string, and then use THAT to parse off the SKU
function _parseSkuFromCallback(text) {
  var userName = (0, _getUserNameFromHandle2.default)(text);
  // NOTE: We're replacing the @handle PLUS the space before it
  var sku = text.replace(' ' + userName, '');
  // console.log(sku)
  return sku;
}

exports.default = purchaseThisPrize;