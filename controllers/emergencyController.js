require("dotenv").config();
const EmergencyContact = require("../models/EmergencyContact");
const EmergencyAddress = require("../models/EmergencyAdd");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const User = require("../models/user")

// ----------------------- EMERGENCY CONTACT -----------------------
exports.addEmergencyContact = async (req, res) => {
  try {
    const { name, relation, phone, email } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User ID missing" });
    }

    if (!name || !relation || !phone) {
      return res.status(400).json({ message: "Name, relation, and phone are required" });
    }

    const newContact = new EmergencyContact({
      name,
      relation,
      phone,
      email,
      user: userId,
    });

    await newContact.save();
    
    // Update user collection with emergency contact reference
    await User.findByIdAndUpdate(userId, { emergencyContact: newContact._id });

    return res.status(200).json({
      message: "Emergency contact added successfully",
      contact: newContact,
    });
    
  } catch (err) {
    console.error("❌ Add Emergency Contact Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getEmergencyContacts = async (req, res) => {
  try {
    const userId = req.user?.id;

    const emergencyContacts = await EmergencyContact.find({ user: userId });

    if (!emergencyContacts || emergencyContacts.length === 0) {
      return res.status(404).json({ message: "No emergency contacts found" });
    }

    return res.status(200).json({ emergencyContacts });
  } catch (err) {
    console.error("❌ Get Emergency Contacts Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


exports.updateEmergencyContact = async (req, res) => {
  try {
    const { name, relation, phone, email } = req.body;
    const userId = req.user?.id;

    const contact = await EmergencyContact.findOne({ user: userId });
    if (!contact) {
      return res.status(404).json({ message: "Emergency contact not found" });
    }

    contact.name = name || contact.name;
    contact.relation = relation || contact.relation;
    contact.phone = phone || contact.phone;
    contact.email = email || contact.email;

    await contact.save();

    return res.status(200).json({ message: "Emergency contact updated successfully" });
  } catch (err) {
    console.error("❌ Update Emergency Contact Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ----------------------- EMERGENCY ADDRESS -----------------------

exports.addEmergencyAddress = async (req, res) => {
  try {
    const { addressType, address } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User ID missing" });
    }

    if (!addressType || !address) {
      return res.status(400).json({ message: "Address type and address are required" });
    }

    // Use Google Maps Geocoding API
    const API_KEY = process.env.API_KEY;
    const encodedAddress = encodeURIComponent(address);
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${API_KEY}`;

    console.log("🚀 Geo URL:", geoUrl);

    const geoResponse = await fetch(geoUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!geoResponse.ok) {
      throw new Error(`Google Maps API error: ${geoResponse.statusText}`);
    }

    const geoData = await geoResponse.json();

    if (
      geoData.status !== "OK" ||
      !geoData.results ||
      geoData.results.length === 0
    ) {
      return res.status(400).json({ message: "Unable to geocode address using Google Maps API" });
    }

    const { lat, lng } = geoData.results[0].geometry.location;

    const newAddress = new EmergencyAddress({
      addressType,
      address,
      latitude: lat,
      longitude: lng,
      userId,
    });

    await newAddress.save();

    await User.findByIdAndUpdate(userId, { emergencyAddress: newAddress._id });
    res.status(200).json({ message: "Emergency address saved successfully" });
  } catch (err) {
    console.error("❌ Google Geocoding Error:", err.message);
    res.status(500).json({ message: "Server error while saving emergency address" });
  }
};

exports.getEmergencyAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const address = await EmergencyAddress.findOne({ userId });

    if (!address) {
      return res.status(404).json({ message: "Emergency address not found" });
    }

    res.status(200).json({ address });
  } catch (err) {
    console.error("❌ Get Emergency Address Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateEmergencyAddress = async (req, res) => {
  try {
    const { addressType, address, latitude, longitude } = req.body;
    const userId = req.user?.id;

    const addressDoc = await EmergencyAddress.findOne({ userId });
    if (!addressDoc) {
      return res.status(404).json({ message: "No address found" });
    }

    addressDoc.addressType = addressType || addressDoc.addressType;
    addressDoc.address = address || addressDoc.address;
    addressDoc.latitude = latitude;
    addressDoc.longitude = longitude;

    await addressDoc.save();

    res.status(200).json({ message: "Emergency address updated successfully" });
  } catch (err) {
    console.error("❌ Update Emergency Address Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
