import mongoose from "mongoose";
const Schema = mongoose.Schema;

const CompanySchema = new Schema({
  email: {
    type: String,
    required: true
  },
  applications: [{ type: Schema.Types.ObjectId, ref: "application" }]
});

const Company = mongoose.model("company", CompanySchema);

export default Company;
