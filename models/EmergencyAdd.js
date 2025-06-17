const mongoose = require("mongoose");

const emergencyAddressSchema = new mongoose.Schema({
    addressType: { type: String, enum: ["Home", "Office", "Other"], required: true },
    address: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true  },
  });

module.exports = mongoose.model("EmergencyAddress", emergencyAddressSchema);