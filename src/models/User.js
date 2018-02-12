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
UserSchema.statics.findOneOrCreate = function(user, cb) {
  const self = this;
  self.findOne({ email: user.email }, (err, result) => {
    return result
      ? cb(err, result)
      : self.create(user, (err, result) => {
          return cb(err, result);
        });
  });
};
const User = mongoose.model("user", UserSchema);

export default User;
