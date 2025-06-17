const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relation: { type: String, required: true }, // e.g., Mother, Friend, Sibling
  phone: { type: String, required: true },
  email: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" ,required: true  },
});

module.exports = mongoose.model("EmergencyContact", emergencyContactSchema);