/*
 * Request Handlers
 *
 */

// Dependencies
var _data = require("./data");
var helpers = require("./helpers");

// Define all the handlers
var handlers = {};

// Ping
handlers.ping = function (data, callback) {
  callback(200);
};

// Not-Found
handlers.notFound = function (data, callback) {
  callback(404);
};

// Users
handlers.users = function (data, callback) {
  var acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the users methods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function (data, callback) {
  // Check that all required fields are filled out
  var firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  var lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  var phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  var password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  var tosAgreement =
    typeof data.payload.tosAgreement == "boolean" &&
    data.payload.tosAgreement == true
      ? true
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure the user doesnt already exist
    _data.read("users", phone, function (err, data) {
      if (err) {
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if (hashedPassword) {
          var userObject = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            hashedPassword: hashedPassword,
            tosAgreement: true,
          };

          // Store the user
          _data.create("users", phone, userObject, function (err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: "Could not create the new user" });
            }
          });
        } else {
          callback(500, { Error: "Could not hash the user's password." });
        }
      } else {
        // User alread exists
        callback(400, {
          Error: "A user with that phone number already exists",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Required data: phone
// Optional data: none
handlers._users.get = function (data, callback) {
  // Check that phone number is valid
  var phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    // Get token from headers
    var token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", phone, function (err, data) {
          if (!err && data) {
            // Remove the hashed password from the user user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid.",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function (data, callback) {
  // Check for required field
  var phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;

  // Check for optional fields
  var firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  var lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  var password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  // Error if phone is invalid
  if (phone) {
    // Error if nothing is sent to update
    if (firstName || lastName || password) {
      // Get token from headers
      var token =
        typeof data.headers.token == "string" ? data.headers.token : false;

      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
        if (tokenIsValid) {
          // Lookup the user
          _data.read("users", phone, function (err, userData) {
            if (!err && userData) {
              // Update the fields if necessary
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the new updates
              _data.update("users", phone, userData, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: "Could not update the user." });
                }
              });
            } else {
              callback(400, { Error: "Specified user does not exist." });
            }
          });
        } else {
          callback(403, {
            Error: "Missing required token in header, or token is invalid.",
          });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update." });
    }
  } else {
    callback(400, { Error: "Missing required field." });
  }
};

// Required data: phone
// @TODO Cleanup (delete) any other data files associated with the user
handlers._users.delete = function (data, callback) {
  // Check that phone number is valid
  var phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    // Get token from headers
    var token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", phone, function (err, data) {
          if (!err && data) {
            _data.delete("users", phone, function (err) {
              if (!err) {
                callback(200);
              } else {
                callback(500, { Error: "Could not delete the specified user" });
              }
            });
          } else {
            callback(400, { Error: "Could not find the specified user." });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid.",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Tokens
handlers.tokens = function (data, callback) {
  var acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function (data, callback) {
  var phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  var password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  if (phone && password) {
    // Lookup the user who matches that phone number
    _data.read("users", phone, function (err, userData) {
      if (!err && userData) {
        // Hash the sent password, and compare it to the password stored in the user object
        var hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          // If valid, create a new token with a random name. Set an expiration date 1 hour in the future.
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
            phone: phone,
            id: tokenId,
            expires: expires,
          };

          // Store the token
          _data.create("tokens", tokenId, tokenObject, function (err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: "Could not create the new token" });
            }
          });
        } else {
          callback(400, {
            Error:
              "Password did not match the specified user's stored password",
          });
        }
      } else {
        callback(400, { Error: "Could not find the specified user." });
      }
    });
  } else {
    callback(400, { Error: "Missing required field(s)." });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function (data, callback) {
  // Check that id is valid
  var id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    // Lookup the token
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing required field, or field invalid" });
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function (data, callback) {
  var id =
    typeof data.payload.id == "string" && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;
  var extend =
    typeof data.payload.extend == "boolean" && data.payload.extend == true
      ? true
      : false;
  if (id && extend) {
    // Lookup the existing token
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        // Check to make sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          // Store the new updates
          _data.update("tokens", id, tokenData, function (err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                Error: "Could not update the token's expiration.",
              });
            }
          });
        } else {
          callback(400, {
            Error: "The token has already expired, and cannot be extended.",
          });
        }
      } else {
        callback(400, { Error: "Specified user does not exist." });
      }
    });
  } else {
    callback(400, {
      Error: "Missing required field(s) or field(s) are invalid.",
    });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function (data, callback) {
  // Check that id is valid
  var id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    // Lookup the token
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        // Delete the token
        _data.delete("tokens", id, function (err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete the specified token" });
          }
        });
      } else {
        callback(400, { Error: "Could not find the specified token." });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function (id, phone, callback) {
  // Lookup the token
  _data.read("tokens", id, function (err, tokenData) {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Validators
handlers.validators = function (data, callback) {
  var acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._validators[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
handlers._validators = {};

handlers._validators.post = function (data, callback) {
  var epochNum =
    typeof data.payload.epochNum == "string" &&
    data.payload.epochNum.trim().length > 0
      ? data.payload.epochNum.trim()
      : false;
  //Dependencies
  const sqlite3 = require("sqlite3").verbose();
  const fs = require("fs");

  // open database from file
  let db = new sqlite3.Database("./scores.sqlite3", (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Connected to the SQlite database.");
  });

  //query
  let sql =
    "SELECT * FROM scores2 as s WHERE epoch > -1 AND marinade_staked > 0 ORDER BY epoch ASC, rank ASC";
  let params = [];
  var holder = [];
  var vote_address_index = {}
  var index = -1;
  db.each(sql, params, (err, row) => {
    var vote_address = row.vote_address;
    if (vote_address_index[`${vote_address}`] == null) {
      index++;
      var toy = {};
      toy["validator_vote_address"] = row.vote_address;
      toy["keybase_id"] = row.keybase_id;
      toy["validator_description"] = row.name;
      toy["stats"] = [];
      holder.push(toy);
      var stats = {};
      stats["epoch"] = row.epoch;
      stats["rank"] = row.rank;
      stats["score"] = row.score;
      stats["credits_observed"] = row.credits_observed;
      stats["vote_address"] = row.vote_address;
      stats["commission"] = row.commission;
      stats["avg_position"] = row.average_position;
      stats["data_center_concentration"] = row.data_center_concentration;
      stats["avg_active_stake"] = row.avg_active_stake;
      stats["apy"] = row.apy;
      stats["delinquent"] = row.delinquent;
      stats["this_epoch_credits"] = row.this_epoch_credits;
      stats["marinade_staked"] = row.marinade_staked;
      stats["should_have"] = row.should_have;
      stats["remove_level"] = row.remove_level;
      stats["remove_level_reason"] = row.remove_level_reason;

      // Deprecated for scores2
      // stats["can_halt_the_network_group"] = row.can_halt_the_network_group;
      // stats["stake_state"] = row.stake_state;
      // stats["stake_state_reason"] = row.stake_state_reason;
      // stats["pct"] = row.pct;
      // stats["stake_conc"] = row.stake_conc;
      // stats["adj_credits"] = row.adj_credits;
      holder[index]["stats"].push(stats);
      vote_address_index[`${vote_address}`] = index
      
    } else {
      var stats = {};
      stats["epoch"] = row.epoch;
      stats["rank"] = row.rank;
      stats["score"] = row.score;
      stats["credits_observed"] = row.credits_observed;
      stats["vote_address"] = row.vote_address;
      stats["commission"] = row.commission;
      stats["avg_position"] = row.average_position;
      stats["data_center_concentration"] = row.data_center_concentration;
      stats["avg_active_stake"] = row.avg_active_stake;
      stats["apy"] = row.apy;
      stats["delinquent"] = row.delinquent;
      stats["this_epoch_credits"] = row.this_epoch_credits;
      stats["marinade_staked"] = row.marinade_staked;
      stats["should_have"] = row.should_have;
      stats["remove_level"] = row.remove_level;
      stats["remove_level_reason"] = row.remove_level_reason;

      // Deprecated for scores2
      // stats["can_halt_the_network_group"] = row.can_halt_the_network_group;
      // stats["stake_state"] = row.stake_state;
      // stats["stake_state_reason"] = row.stake_state_reason;
      // stats["pct"] = row.pct;
      // stats["stake_conc"] = row.stake_conc;
      // stats["adj_credits"] = row.adj_credits;
      holder[vote_address_index[`${vote_address}`]]["stats"].push(stats);
    }
  });

  // close the database connection
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Closed the database connection.");
    jsonHolder = JSON.stringify(holder);
    fs.writeFileSync("validators.json", jsonHolder);
  });
};

handlers._validators.get = function (data, callback) {
  if(data.nestedRoute.length==1){
    // set up pagination
    // helpers.generateValidators();  
    const page = parseInt(data.page);
    const limit = data.limit ? data.limit : 10;
    _data.read("epochs", "validators", function (err, data) {
      if (!err && data) {
        // Create indexing
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const result = {};

        // Parse data into array
        const entries = Object.values(data);

        // 404 if page is negative or over last page
        if (result.totalPages < page || page < 1) {
          result.error = "Invalid Query";
          callback(404, result);
          return;
        }

        // Populate result object
        result.totalPages = Math.ceil(entries.length / limit);

        // Reverse the epoch stats
        var temp = entries.slice(startIndex, endIndex);
        temp.forEach((validator,i) => {
          temp[i].epoch_stats = validator.epoch_stats.reverse();
        })
        
        result.validators = temp;
        
        callback(200, result);
      } else {
        callback(404);
      }
    });
  } else if(data.nestedRoute.length==2){
    if(data.nestedRoute[1] == 'count'){
      _data.read("epochs", "validators", function (err, data) {
        if (!err && data) {
             
            // Parse data into array
            const entries = Object.values(data);

            // const mostRecentEpoch = entries[entries]
            // const filteredEntries = entries.filer((validator) => validator.epoch_stats)
            // entries.forEach((validator, i) => {
            //   console.log(validator)
            // })

          result = {}

          result.count = entries.length;
          
          callback(200, result);
        } else {
          callback(404);
        }
      });
    }
  }
  
};

handlers._validators.put = function (data, callback) {
  console.log("placed");
  callback(200);
};
handlers._validators.delete = function (data, callback) {
  console.log("deleted");
  callback(200);
};

// Export the handlers
module.exports = handlers;
