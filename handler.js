"use strict";
var QuickBooks = require("node-quickbooks");
var Tokens = require("csrf");
var csrf = new Tokens();
QuickBooks.setOauthVersion("2.0");

function generateAntiForgery(session) {
  session.secret = csrf.secretSync();
  return csrf.create(session.secret);
}

module.exports.hello = (event, context, callback) => {
  var redirecturl =
    "https://appcenter.intuit.com/connect/oauth2" +
    "?client_id=" +
    process.env.QB_CONSUMER_KEY +
    "&redirect_uri=" +
    encodeURIComponent("http://localhost:3000/callback/") +
    "&scope=com.intuit.quickbooks.accounting" +
    "&response_type=code" +
    "&state=" +
    generateAntiForgery({});
  context.succeed({ location: redirecturl });
};
