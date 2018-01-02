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
  tools.setScopes("sign_in_with_intuit");
  console.log("check");
  console.log(tools.intuitAuth);
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
              context.succeed({ message: "connected" });
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
