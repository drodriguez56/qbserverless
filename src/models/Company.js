import mongoose from "mongoose";
const Schema = mongoose.Schema;

const CompanySchema = new Schema({
  email: {
    type: String,
    required: true
  },
  users: [{ type: Schema.Types.ObjectId, ref: "user" }]
});

const Company = mongoose.model("company", CompanySchema);

export default Company;
