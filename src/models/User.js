import mongoose from "mongoose";
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
  token: tokenSchema,
  realmId: String
});

const User = mongoose.model("user", UserSchema);

export default User;
