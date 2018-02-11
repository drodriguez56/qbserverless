import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ApplicationSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: "company" },
  user: { type: Schema.Types.ObjectId, ref: "user" }
});

const Application = mongoose.model("application", ApplicationSchema);

export default Application;
