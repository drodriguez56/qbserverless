import mongoose from "mongoose";
const Schema = mongoose.Schema;
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
  session: String,
  applications: [{ type: Schema.Types.ObjectId, ref: "application" }]
});

const User = mongoose.model("user", UserSchema);

export default User;
