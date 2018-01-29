(function(e, a) { for(var i in a) e[i] = a[i]; }(exports, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("request");

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = {"redirectUri":"http://localhost:3000/callback/","configurationEndpoint":"https://developer.api.intuit.com/.well-known/openid_sandbox_configuration/","api_uri":"https://sandbox-quickbooks.api.intuit.com/v3/company/","scopes":{"sign_in_with_intuit":["openid","profile","email","phone","address"],"connect_to_quickbooks":["com.intuit.quickbooks.accounting"],"connect_handler":["com.intuit.quickbooks.accounting","openid","profile","email","phone","address"]}}

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("mongoose");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("csrf");

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _promise = __webpack_require__(7);

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Tokens = __webpack_require__(3);
var csrf = new Tokens();
var ClientOAuth2 = __webpack_require__(8);
var request = __webpack_require__(0);
var config = __webpack_require__(1);

var Tools = function Tools() {
  var tools = this;

  // Use a local copy for startup.  This will be updated in refreshEndpoints() to call:
  // https://developer.api.intuit.com/.well-known/openid_configuration/
  this.openid_configuration = __webpack_require__(9);

  var authConfig = {
    clientId: process.env.QB_CONSUMER_KEY,
    clientSecret: process.env.QB_CONSUMER_SECRET,
    redirectUri: config.redirectUri,
    authorizationUri: this.openid_configuration.authorization_endpoint,
    accessTokenUri: this.openid_configuration.token_endpoint
  };

  this.basicAuth = __webpack_require__(10)(authConfig.clientId + ":" + authConfig.clientSecret);

  // Should be called at app start & scheduled to run once a day
  // Get the latest OAuth/OpenID endpoints from Intuit
  this.refreshEndpoints = function () {
    request({
      // Change this to Sandbox or non-sandbox in `config.json`
      // Non-sandbox: https://developer.api.intuit.com/.well-known/openid_configuration/
      // Sandbox: https://developer.api.intuit.com/.well-known/openid_sandbox_configuration/
      url: config.configurationEndpoint,
      headers: {
        Accept: "application/json"
      }
    }, function (err, response) {
      if (err) {
        console.log(err);
        return err;
      }

      // Update endpoints
      var json = JSON.parse(response.body);
      tools.openid_configuration = json;
      tools.openid_uri = json.userinfo_endpoint;
      tools.revoke_uri = json.revocation_endpoint;

      // Re-create OAuth2 Client
      authConfig.authorizationUri = json.authorization_endpoint;
      authConfig.accessTokenUri = json.token_endpoint;
      tools.intuitAuth = new ClientOAuth2(authConfig);
    });
  };

  // Should be used to check for 401 response when making an API call.  If a 401
  // response is received, refresh tokens should be used to get a new access token,
  // and the API call should be tried again.
  this.checkForUnauthorized = function (req, requestObj, err, response) {
    return new _promise2.default(function (resolve, reject) {
      if (response.statusCode == 401) {
        console.log("Received a 401 response!  Trying to refresh tokens.");

        // Refresh the tokens
        tools.refreshTokens(req.session).then(function (newToken) {
          // Try API call again, with new accessToken
          requestObj.headers.Authorization = "Bearer " + newToken.accessToken;
          console.log("Trying again, making API call to: " + requestObj.url);
          request(requestObj, function (err, response) {
            // Logic (including error checking) should be continued with new
            // err/response objects.
            resolve({ err: err, response: response });
          });
        }, function (err) {
          // Error refreshing the tokens
          reject(err);
        });
      } else {
        // No 401, continue!
        resolve({ err: err, response: response });
      }
    });
  };

  // Refresh Token should be called if access token expires, or if Intuit
  // returns a 401 Unauthorized.
  this.refreshTokens = function (session) {
    var token = this.getToken(session);

    // Call refresh API
    return token.refresh().then(function (newToken) {
      // Store the new tokens
      tools.saveToken(session, newToken);
      return newToken;
    });
  };

  this.setScopes = function (flowName) {
    authConfig.scopes = config.scopes[flowName];
    tools.intuitAuth = new ClientOAuth2(authConfig);
  };

  this.containsOpenId = function () {
    if (!authConfig.scopes) return false;
    return authConfig.scopes.includes("openid");
  };

  // Setup OAuth2 Client with values from config.json
  this.intuitAuth = new ClientOAuth2(authConfig);

  // Get anti-forgery token to use for state
  this.generateAntiForgery = function (session) {
    session.secret = csrf.secretSync();
    return csrf.create(session.secret);
  };

  this.verifyAntiForgery = function (session, token) {
    return csrf.verify(session.secret, token);
  };

  this.clearToken = function (session) {
    session.accessToken = null;
    session.refreshToken = null;
    session.tokenType = null;
    session.data = null;
  };

  // Save token into session storage
  // In a real use-case, this is where tokens would have to be persisted (to a
  // a SQL DB, for example).  Both access tokens and refresh tokens need to be
  // persisted.  This should typically be stored against a user / realm ID, as well.
  this.saveToken = function (session, token) {
    session.accessToken = token.accessToken;
    session.refreshToken = token.refreshToken;
    session.tokenType = token.tokenType;
    session.data = token.data;
    return session;
  };

  // Get the token object from session storage
  this.getToken = function (session) {
    if (!session.accessToken) return null;

    return tools.intuitAuth.createToken(session.accessToken, session.refreshToken, session.tokenType, session.data);
  };

  this.refreshEndpoints();
};

module.exports = new Tools();

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadReport = exports.company = exports.user = exports.createCompany = exports.connected = exports.qbCallback = exports.qbAuthUrl = undefined;

var _stringify = __webpack_require__(6);

var _stringify2 = _interopRequireDefault(_stringify);

var _request = __webpack_require__(0);

var _request2 = _interopRequireDefault(_request);

var _csrf = __webpack_require__(3);

var _csrf2 = _interopRequireDefault(_csrf);

var _tools = __webpack_require__(4);

var _tools2 = _interopRequireDefault(_tools);

var _jwt = __webpack_require__(11);

var _jwt2 = _interopRequireDefault(_jwt);

var _jwtDecode = __webpack_require__(16);

var _jwtDecode2 = _interopRequireDefault(_jwtDecode);

var _bluebird = __webpack_require__(17);

var _bluebird2 = _interopRequireDefault(_bluebird);

var _mongoose = __webpack_require__(2);

var _mongoose2 = _interopRequireDefault(_mongoose);

var _User = __webpack_require__(18);

var _User2 = _interopRequireDefault(_User);

var _Company = __webpack_require__(19);

var _Company2 = _interopRequireDefault(_Company);

var _config = __webpack_require__(1);

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var csrf = new _csrf2.default();
var mongoString = process.env.MONGO_URL;

_mongoose2.default.Promise = _bluebird2.default;

var generateAntiForgery = function generateAntiForgery(session) {
  session.secret = csrf.secretSync();
  return csrf.create(session.secret);
};

var qbAuthUrl = exports.qbAuthUrl = function qbAuthUrl(event, context, callback) {
  _tools2.default.setScopes("connect_handler");
  // Constructs the authorization URI.
  var uri = _tools2.default.intuitAuth.code.getUri({
    // Add CSRF protection
    state: _tools2.default.generateAntiForgery({})
  });

  console.log("Redirecting to authorization uri: " + uri);

  context.succeed({ location: uri });
};

var qbCallback = exports.qbCallback = function qbCallback(event, context, callback) {
  var realmId = event.body.realmId;
  if (!realmId) {
    return context.done(new Error("Error - cant connect without company id"), {});
  }
  // if (e)) {
  //   return context.done(
  //     new Error("Error - invalid anti-forgery CSRF response!"),
  //     {}
  //   );
  // }
  var errorFn = function errorFn(e) {
    console.log(e);
    return callback(new Error(e), {});
  };
  _tools2.default.intuitAuth.code.getToken(event.headers.Referer).then(function (token) {
    // TODO: Store token - this would be where tokens would need to be
    // save realmIdnd token as new client on company
    var session = _tools2.default.saveToken({}, token);
    if (token.data.id_token) {
      try {
        // We should decode and validate the ID token
        _jwt2.default.validate(token.data.id_token, function () {
          callback(null, { session: session });
        }, errorFn);
      } catch (e) {
        return errorFn(e);
      }
    } else {
      callback(null, { message: "connected" });
    }
  }, function (err) {
    return errorFn(err);
  });
};

var connected = exports.connected = function connected(event, context, callback) {
  var companyId = event.body.companyId;
  if (!companyId) return context.done(new Error("No realm ID.  QBO calls only work if the accounting scope was passed!"), {});
  var token = _tools2.default.getToken(event.body.session);
  var url = _tools2.default.openid_configuration.userinfo_endpoint;
  console.log("Making API call to: " + url);
  var requestObj = {
    url: url,
    headers: {
      Authorization: "Bearer " + token.accessToken,
      Accept: "application/json"
    }
  };
  (0, _request2.default)(requestObj, function (err, response) {
    // Check if 401 response was returned - refresh tokens if so!
    _tools2.default.checkForUnauthorized(event.body, requestObj, err, response).then(function (_ref) {
      var err = _ref.err,
          response = _ref.response;

      if (err || response.statusCode != 200) {
        return context.done(new Error(err), {});
      }

      // API Call was a success!
      var data = JSON.parse(response.body);
      var db = {};
      var errs = {};
      var user = {};
      var mongooseId = "_id";

      db = _mongoose2.default.connect(mongoString, {
        useMongoClient: true
      });
      user = new _User2.default({
        email: data.email,
        firstname: data.givenName,
        lastname: data.familyName,
        session: (0, _stringify2.default)(event.body.session)
      });
      console.log("starting db save");
      db.once("open", function () {
        _Company2.default.findById(companyId).then(function (company) {
          return user.save().then(function () {
            company.users.push(user);
            return company.save();
          });
        }).then(function () {
          callback(null, {
            statusCode: 200,
            body: (0, _stringify2.default)({ id: user[mongooseId] })
          });
        }).catch(function (err) {
          console.log(err);
          callback(null, createErrorResponse(err.statusCode, err.message));
        }).finally(function () {
          db.close();
        });
      });
    }, function (err) {
      console.log(err);
      return context.done(new Error(err), {});
    });
  });
};
var createErrorResponse = function createErrorResponse(statusCode, message) {
  return {
    statusCode: statusCode || 501,
    headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
    body: message || "Incorrect id"
  };
};

//USER

var createCompany = exports.createCompany = function createCompany(event, context, callback) {
  var db = {};
  var errs = {};
  var company = {};
  var mongooseId = "_id";

  db = _mongoose2.default.connect(mongoString, {
    useMongoClient: true
  });

  company = new _Company2.default({
    email: event.request.userAttributes.email
  });

  db.once("open", function () {
    company.save().then(function () {
      return context.succeed(event);
    }).catch(function (err) {
      return context.fail("Signup Failed. to saved to DB");
    }).finally(function () {
      db.close();
    });
  });
};

var user = exports.user = function user(event, context, callback) {
  var db = {};
  db = _mongoose2.default.connect(mongoString, {
    useMongoClient: true
    /* other options */
  });
  var id = event.pathParameters.id;

  db.once("open", function () {
    _User2.default.find({ _id: event.pathParameters.id }).then(function (user) {
      callback(null, { statusCode: 200, body: (0, _stringify2.default)(user) });
    }).catch(function (err) {
      callback(null, createErrorResponse(err.statusCode, err.message));
    }).finally(function () {
      // Close db connection or node event loop won't exit , and lambda will timeout
      db.close();
    });
  });
};

var company = exports.company = function company(event, context, callback) {
  var _id = event.pathParameters.id;

  var response = function response(company) {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*" // Required for CORS support to work
      },
      body: (0, _stringify2.default)(company)
    };
  };

  var db = {};
  db = _mongoose2.default.connect(mongoString, {
    useMongoClient: true
    /* other options */
  });

  db.once("open", function () {
    _Company2.default.find({ _id: _id }).populate({
      path: "users"
    }).then(function (company) {
      callback(null, response(company));
    }).catch(function (err) {
      callback(null, createErrorResponse(err.statusCode, err.message));
    }).finally(function () {
      // Close db connection or node event loop won't exit , and lambda will timeout
      db.close();
    });
  });
};

// QUICKBOOKS API CALS

var loadReport = exports.loadReport = function loadReport(event, context, callback) {
  var _event$body = event.body,
      reportType = _event$body.reportType,
      realmId = _event$body.realmId,
      startDate = _event$body.startDate,
      endDate = _event$body.endDate;

  if (!realmId) {
    callback(null, createErrorResponse(500, "No realm ID.  QBO calls only work if the accounting scope was passed!"));
  }
  var token = _tools2.default.getToken(event.body.session);
  // date format YYYY-MM-DD
  var url = _config2.default.api_uri + realmId + ("/reports/" + reportType + "?start_date=" + startDate + "&end_date=" + endDate);
  console.log("Making API call to: " + url);
  var requestObj = {
    url: url,
    headers: {
      Authorization: "Bearer " + token.accessToken,
      Accept: "application/json"
    }
  };
  (0, _request2.default)(requestObj, function (err, response) {
    // Check if 401 response was returned - refresh tokens if so!
    _tools2.default.checkForUnauthorized(event.body, requestObj, err, response).then(function (_ref2) {
      var err = _ref2.err,
          response = _ref2.response;

      console.log(response.statusCode);
      if (err || response.statusCode != 200) {
        callback(null, createErrorResponse(err && err.statusCode || response.statusCode, err && err.message || response.body));
      }
      callback(null, {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*" // Required for CORS support to work
        },
        body: (0, _stringify2.default)(response.body)
      });
    }, function (err) {
      console.log(err);
      callback(null, createErrorResponse(err.statusCode, err.message));
    });
  });
};

/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = require("babel-runtime/core-js/json/stringify");

/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = require("babel-runtime/core-js/promise");

/***/ }),
/* 8 */
/***/ (function(module, exports) {

module.exports = require("client-oauth2");

/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = {"issuer":"https://oauth.platform.intuit.com/op/v1","authorization_endpoint":"https://appcenter.intuit.com/connect/oauth2","token_endpoint":"https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer","userinfo_endpoint":"https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo","revocation_endpoint":"https://developer.api.intuit.com/v2/oauth2/tokens/revoke","jwks_uri":"https://oauth.platform.intuit.com/op/v1/jwks","response_types_supported":["code"],"subject_types_supported":["public"],"id_token_signing_alg_values_supported":["RS256"],"scopes_supported":["openid","email","profile","address","phone"],"token_endpoint_auth_methods_supported":["client_secret_post","client_secret_basic"],"claims_supported":["aud","exp","iat","iss","realmid","sub"]}

/***/ }),
/* 10 */
/***/ (function(module, exports) {

module.exports = require("btoa");

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var atob = __webpack_require__(12);
var expect = __webpack_require__(13);
var request = __webpack_require__(0);
var tools = __webpack_require__(4);
var config = __webpack_require__(1);

var JWT = function JWT() {
  var jwt = this;

  // Performs the correct JWT validation steps
  this.validate = function (id_token, callback, errorFn) {
    // https://developer.api.intuit.com/.well-known/openid_configuration/
    var openid_configuration = tools.openid_configuration;

    // Decode ID Token
    var token_parts = id_token.split(".");
    var idTokenHeader = JSON.parse(atob(token_parts[0]));
    var idTokenPayload = JSON.parse(atob(token_parts[1]));
    var idTokenSignature = atob(token_parts[2]);

    // Step 1 : First check if the issuer is as mentioned in "issuer" in the discovery doc
    expect(idTokenPayload.iss).toEqual(openid_configuration.issuer);

    // Step 2 : check if the aud field in idToken is same as application's clientId
    expect(idTokenPayload.aud).toEqual([process.env.QB_CONSUMER_KEY]);

    // Step 3 : ensure the timestamp has not elapsed
    expect(idTokenPayload.exp).toBeGreaterThan(Date.now() / 1000);

    // Step 4: Verify that the ID token is properly signed by the issuer
    jwt.getKeyFromJWKsURI(idTokenHeader.kid, function (key) {
      var cert = jwt.getPublicKey(key.n, key.e);
      // Validate the RSA encryption
      __webpack_require__(14).verify(id_token, cert, function (err) {
        if (err) errorFn(err);else callback();
      });
    });
  };

  // Loads the correct key from JWKs URI:
  // https://oauth.platform.intuit.com/op/v1/jwks
  this.getKeyFromJWKsURI = function (kid, callback) {
    var openid_configuration = tools.openid_configuration;

    request({
      url: openid_configuration.jwks_uri,
      json: true
    }, function (error, response, body) {
      if (error || response.statusCode != 200) {
        throw new Error("Could not reach JWK endpoint");
      }
      // Find the key by KID
      var key = body.keys.find(function (el) {
        return el.kid == kid;
      });
      callback(key);
    });
  };

  // Creates a PEM style RSA public key, using the modulus (n) and exponent (e)
  this.getPublicKey = function (modulus, exponent) {
    var getPem = __webpack_require__(15);
    var pem = getPem(modulus, exponent);
    return pem;
  };
};

module.exports = new JWT();

/***/ }),
/* 12 */
/***/ (function(module, exports) {

module.exports = require("atob");

/***/ }),
/* 13 */
/***/ (function(module, exports) {

module.exports = require("expect");

/***/ }),
/* 14 */
/***/ (function(module, exports) {

module.exports = require("jsonwebtoken");

/***/ }),
/* 15 */
/***/ (function(module, exports) {

module.exports = require("rsa-pem-from-mod-exp");

/***/ }),
/* 16 */
/***/ (function(module, exports) {

module.exports = require("jwt-decode");

/***/ }),
/* 17 */
/***/ (function(module, exports) {

module.exports = require("bluebird");

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _mongoose = __webpack_require__(2);

var _mongoose2 = _interopRequireDefault(_mongoose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Schema = _mongoose2.default.Schema;
var UserSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  firstname: {
    type: String
  },
  lastname: {
    type: String
  },
  session: String
});

var User = _mongoose2.default.model("user", UserSchema);

exports.default = User;

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _mongoose = __webpack_require__(2);

var _mongoose2 = _interopRequireDefault(_mongoose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Schema = _mongoose2.default.Schema;

var CompanySchema = new Schema({
  email: {
    type: String,
    required: true
  },
  users: [{ type: Schema.Types.ObjectId, ref: "user" }]
});

var Company = _mongoose2.default.model("company", CompanySchema);

exports.default = Company;

/***/ })
/******/ ])));
//# sourceMappingURL=handler.js.map