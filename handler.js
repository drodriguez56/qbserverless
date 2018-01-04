"use strict";
var request = require("request");
var Tokens = require("csrf");
var tools = require("./tools/tools.js");
var jwt = require("./tools/jwt.js");
var csrf = new Tokens();

function generateAntiForgery(session) {
  session.secret = csrf.secretSync();
  return csrf.create(session.secret);
}

module.exports.qbAuthUrl = (event, context, callback) => {
  tools.setScopes("connect_handler");
  // Constructs the authorization URI.
  var uri = tools.intuitAuth.code.getUri({
    // Add CSRF protection
    state: tools.generateAntiForgery({})
  });

  // Redirect
  console.log("Redirecting to authorization uri: " + uri);

  context.succeed({ location: uri });
};

module.exports.qbCallback = (event, context, callback) => {
  // if (e)) {
  //   return context.done(
  //     new Error("Error - invalid anti-forgery CSRF response!"),
  //     {}
  //   );
  // }
  tools.intuitAuth.code.getToken(event.headers.Referer).then(
    function(token) {
      console.log(token);
      // Store token - this would be where tokens would need to be
      // persisted (in a SQL DB, for example).
      // tools.saveToken(req.session, token);
      // req.session.realmId = req.query.realmId;
      var session = tools.saveToken({}, token);
      var errorFn = function(e) {
        console.log(e);
        return context.done(new Error(e), {});
      };
      if (token.data.id_token) {
        try {
          // We should decode and validate the ID token
          jwt.validate(
            token.data.id_token,
            function() {
              // Callback function - redirect to /connected
              callback(null, { session: session });
            },
            errorFn
          );
        } catch (e) {
          return errorFn(e);
        }
      } else {
        // Redirect to /connected
        context.succeed({ message: "connected" });
      }
    },
    function(err) {
      console.log(err);
      return errorFn(err);
    }
  );
};

module.exports.connected = (event, context, callback) => {
  var token = tools.getToken(event.body.session);
  console.log(token);
  var url = tools.openid_configuration.userinfo_endpoint;
  console.log("Making API call to: " + url);
  var requestObj = {
    url: url,
    headers: {
      Authorization: "Bearer " + token.accessToken,
      Accept: "application/json"
    }
  };
  request(requestObj, function(err, response) {
    // Check if 401 response was returned - refresh tokens if so!
    tools.checkForUnauthorized(event.body, requestObj, err, response).then(
      function({ err, response }) {
        if (err || response.statusCode != 200) {
          return context.done(new Error(err), {});
        }

        // API Call was a success!
        callback(null, { data: JSON.parse(response.body) });
      },
      function(err) {
        console.log(err);
        return context.done(new Error(err), {});
      }
    );
  });
};

module.exports.apiCall = (event, context, callback) => {
  var token = tools.getToken(event.body.token);
  var realmId = event.body.realmId;
  if (!realmId)
    return context.done(
      new Error(
        "No realm ID.  QBO calls only work if the accounting scope was passed!"
      ),
      {}
    );
  console.log(event.body);
  context.succeed({ message: "connected" });
};
