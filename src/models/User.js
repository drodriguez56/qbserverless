const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const tokenSchema = new Schema({
  accessToken: String,
  refreshToken: String
});
const UserSchema = new Schema({
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
  token: tokenSchema
});

const User = mongoose.model("user", UserSchema);

module.exports = User;
