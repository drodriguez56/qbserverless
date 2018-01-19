import mongose from "mongoose";
import User from "./User";
const Schema = mongoose.Schema;

const CompanySchema = new Schema({
  email: {
    type: String,
    required: true
  },
  Users: [User]
});

const Company = mongoose.model("company", CompanySchema);

export default Company;
