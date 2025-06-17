const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNo: {
      type: Number,
      required: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    securityCode: {
      type: String,
      required: false, // Set to true if a security code is always mandatory
    },
    // --- START: CRITICAL SCHEMA ADJUSTMENTS ---
    profilePicUrl: { // RENAMED: Matches frontend and backend update logic
      type: String,
      default: "", // Good practice to have a default empty string for new users
    },
    contact1: { // ADDED: To store primary emergency contact directly
      type: String,
      trim: true, // Removes leading/trailing whitespace
    },
    contact2: { // ADDED: To store secondary emergency contact directly
      type: String,
      trim: true,
    },
    // --- END: CRITICAL SCHEMA ADJUSTMENTS ---

    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other", "Prefer not to say"] }, // Added "Prefer not to say" as common option
    bloodGroup: {
      type: String,
      // You might want an enum here for validation, e.g.:
      // enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
    },
   
    lastLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      timestamp: { type: Date },
    },
    emergencyContacts: [ // Keeping this array of ObjectIDs for now, though contact1/2 are separate fields
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmergencyContact",
      },
    ],
    emergencyAddresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmergencyAddress",
      },
    ],
    sosHistory: [
      {
        location: {
          latitude: { type: Number },
          longitude: { type: Number },
        },
        timestamp: { type: Date, default: Date.now },
        notifiedContacts: [{ type: String }],
        status: {
          type: String,
          enum: ["Active", "Resolved", "Cancelled"],
          default: "Active",
        },
      },
    ],
    deviceToken: {
      token: { type: String },
      type: { type: String, enum: ["expo", "fcm", "apns"], default: "expo" },
      registered_at: { type: Date, default: Date.now },
      updated_at: { type: Date, default: Date.now },
    },
    isSecurityCheckEnabled: { type: Boolean, default: true },
  },

  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

module.exports = mongoose.model("User", userSchema);