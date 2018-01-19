import request from "request";
import Tokens from "csrf";
import tools from "./tools/tools";
import jwt from "./tools/jwt";
import bluebird from "bluebird";

import mongoose from "mongoose";
import User from "./src/models/User";
import Company from "./src/models/Company";

const csrf = new Tokens();
const mongoString = process.env.MONGO_URL;

mongoose.Promise = bluebird;

const generateAntiForgery = session => {
  session.secret = csrf.secretSync();
  return csrf.create(session.secret);
};

export const qbAuthUrl = (event, context, callback) => {
  tools.setScopes("sign_in_with_intuit");
  // Constructs the authorization URI.
  const uri = tools.intuitAuth.code.getUri({
    // Add CSRF protection
    state: tools.generateAntiForgery({})
  });

  // Redirect
  console.log("Redirecting to authorization uri: " + uri);

  context.succeed({ location: uri });
};

export const qbCallback = (event, context, callback) => {
  const realmId = event.body.realmId;
  if (!realmId) {
    return context.done(
      new Error("Error - cant connect without company id"),
      {}
    );
  }
  // if (e)) {
  //   return context.done(
  //     new Error("Error - invalid anti-forgery CSRF response!"),
  //     {}
  //   );
  // }
  //
  const errorFn = e => {
    console.log(e);
    return callback(new Error(e), {});
  };
  tools.intuitAuth.code.getToken(event.headers.Referer).then(
    function(token) {
      // TODO: Store token - this would be where tokens would need to be
      // save realmIdnd token as new client on company
      const session = tools.saveToken({}, token);
      if (token.data.id_token) {
        try {
          // We should decode and validate the ID token
          jwt.validate(
            token.data.id_token,
            () => {
              callback(null, { session: session });
            },
            errorFn
          );
        } catch (e) {
          return errorFn(e);
        }
      } else {
        callback(null, { message: "connected" });
      }
    },
    err => {
      return errorFn(err);
    }
  );
};

export const connected = (event, context, callback) => {
  const token = tools.getToken(event.body.session);
  const url = tools.openid_configuration.userinfo_endpoint;
  console.log("Making API call to: " + url);
  const requestObj = {
    url: url,
    headers: {
      Authorization: "Bearer " + token.accessToken,
      Accept: "application/json"
    }
  };
  request(requestObj, (err, response) => {
    // Check if 401 response was returned - refresh tokens if so!
    tools.checkForUnauthorized(event.body, requestObj, err, response).then(
      ({ err, response }) => {
        if (err || response.statusCode != 200) {
          return context.done(new Error(err), {});
        }

        // API Call was a success!
        const data = JSON.parse(response.body);
        let db = {};
        let errs = {};
        let user = {};
        const mongooseId = "_id";

        db = mongoose.connect(mongoString, {
          useMongoClient: true
          /* other options */
        });
        user = new User({
          email: data.email,
          firstname: data.givenName,
          lastname: data.familyName,
          token: {
            accessToken: event.body.session.accessToken,
            refreshToken: event.body.session.refreshToken
          }
        });
        //
        // errs = user.validateSync();

        // if (errs) {
        //   console.log(errs);
        //   callback(null, createErrorResponse(400, "Incorrect user data"));
        //   db.close();
        //   return;
        // }
        ///
        console.log("starting db save");
        db.once("open", () => {
          user
            .save()
            .then(() => {
              callback(null, {
                statusCode: 200,
                body: JSON.stringify({ id: user[mongooseId] })
              });
            })
            .catch(err => {
              console.log(err);
              callback(null, createErrorResponse(err.statusCode, err.message));
            })
            .finally(() => {
              db.close();
            });
        });
      },
      err => {
        console.log(err);
        return context.done(new Error(err), {});
      }
    );
  });
};

export const apiCall = (event, context, callback) => {
  const token = tools.getToken(event.body.token);
  const realmId = event.body.realmId;
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

//USER
const createErrorResponse = (statusCode, message) => ({
  statusCode: statusCode || 501,
  headers: { "Content-Type": "text/plain" },
  body: message || "Incorrect id"
});

export const createCompany = (event, context, callback) => {
  let db = {};
  let data = {};
  let errs = {};
  let user = {};
  const mongooseId = "_id";

  db = mongoose.connect(mongoString, {
    useMongoClient: true
    /* other options */
  });

  data = JSON.parse(event.body);

  company = new Company({
    email: data.email,
    ip: event.requestContext.identity.sourceIp
  });
  //
  // errs = company.validateSync();

  // if (errs) {
  //   console.log(errs);
  //   callback(null, createErrorResponse(400, "Incorrect company data"));
  //   db.close();
  //   return;
  // }
  ///
  db.once("open", () => {
    company
      .save()
      .then(() => {
        callback(null, {
          statusCode: 200,
          body: JSON.stringify({ id: company[mongooseId] })
        });
      })
      .catch(err => {
        callback(null, createErrorResponse(err.statusCode, err.message));
      })
      .finally(() => {
        db.close();
      });
  });
};

export const user = (event, context, callback) => {
  let db = {};
  db = mongoose.connect(mongoString, {
    useMongoClient: true
    /* other options */
  });
  const id = event.pathParameters.id;

  db.once("open", () => {
    User.find({ _id: event.pathParameters.id })
      .then(user => {
        callback(null, { statusCode: 200, body: JSON.stringify(user) });
      })
      .catch(err => {
        callback(null, createErrorResponse(err.statusCode, err.message));
      })
      .finally(() => {
        // Close db connection or node event loop won't exit , and lambda will timeout
        db.close();
      });
  });
};
