"use strict";
var QuickBooks = require("node-quickbooks");
var request = require("request");
var Tokens = require("csrf");
var decode = require("jwt-decode");
var csrf = new Tokens();
QuickBooks.setOauthVersion("2.0");

function generateAntiForgery(session) {
  session.secret = csrf.secretSync();
  return csrf.create(session.secret);
}

module.exports.qbAuthUrl = (event, context, callback) => {
  var redirecturl =
    "https://appcenter.intuit.com/connect/oauth2" +
    "?client_id=" +
    process.env.QB_CONSUMER_KEY +
    "&redirect_uri=" +
    encodeURIComponent("http://localhost:3000/callback/") +
    "&scope=openid%20email%20phone%20address%20com.intuit.quickbooks.accounting" +
    "&response_type=code" +
    "&state=" +
    generateAntiForgery({});
  context.succeed({ location: redirecturl });
};

module.exports.qbCallback = (event, context, callback) => {
  var auth = new Buffer(
    process.env.QB_CONSUMER_KEY + ":" + process.env.QB_CONSUMER_SECRET
  ).toString("base64");

  var postBody = {
    url: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + auth
    },
    form: {
      grant_type: "authorization_code",
      code: event.body.params.code,
      redirect_uri: "http://localhost:3000/callback/" //Make sure this path matches entry in application dashboard
    }
  };

  request.post(postBody, function(e, r, data) {
    if (e) {
      var err = new Error(e);
      context.done(err, {});
    }
    var response = JSON.parse(r.body);
    if (response.error) {
      var error = new Error(response.error);
      context.done(error, {});
    } else {
      // save the access token somewhere on behalf of the logged in user
      var qbo = new QuickBooks(
        process.env.QB_CONSUMER_KEY,
        process.env.QB_CONSUMER_SECRET,
        response.access_token /* oAuth access token */,
        false /* no token secret for oAuth 2.0 */,
        event.body.params.realmId,
        true /* use a sandbox account */,
        true /* turn debugging on */,
        4 /* minor version */,
        "2.0" /* oauth version */,
        response.refresh_token /* refresh token */
      );
      context.succeed({ message: response });
    }
  });
};
