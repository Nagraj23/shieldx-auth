require('dotenv').config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN,
  process.env.TWILIO_VERIFY_SID
);
const RefreshToken = require("../models/RefreshToken");
const { generateAccessToken, generateRefreshToken, verifyToken } = require("../utils/tokenUtils");

const TOKEN_SECRET = process.env.TOKEN_SECRET || "your_secret_key";

// Temporary in-memory storage (use Redis or MongoDB for production)
const otpStore = new Map();
const pendingUsers = new Map();


// Verify OTP for phone number


// Configure Gmail transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'shieldx.app@gmail.com',
    pass: 'hqku aezq hgdv akhs'
  }
});

// OTP Cleanup Interval
setInterval(() => {
  const now = Date.now();
  otpStore.forEach((value, key) => {
    if (value.expiresAt < now) {
      otpStore.delete(key);
      pendingUsers.delete(key);
      console.log(`⏳ OTP expired for ${key}`);
    }
  });
}, 60000);

// Step 1: Register and send OTP
exports.register = async (req, res) => {
  const { name, email, password, phoneNo } = req.body;

  if (!name || !email || !password || !phoneNo) {
    return res.status(400).json({ message: "All fields required" });
  }

  const userExists = await User.findOne({ email });
  if (userExists)
    return res.status(400).json({ message: "Email already registered" });

  const phoneExists = await User.findOne({ phoneNo });
  if (phoneExists)
    return res.status(400).json({ message: "Phone already registered" });

  if (pendingUsers.has(phoneNo)) {
    return res.status(400).json({ message: "OTP already sent. Please verify." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({
        to: `+91${phoneNo}`,
        channel: "sms",
      });
    pendingUsers.set(phoneNo, { name, email, password: hashedPassword, phoneNo });
    res.status(200).json({ success: true,message: "OTP sent to phone number" });
  } catch (err) {
    console.error("❌ Register OTP error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// Step 2: Resend OTP
exports.resendOtp = async (req, res) => {
  const { phoneNo } = req.body;

  if (!pendingUsers.has(phoneNo)) {
    return res.status(404).json({ message: "No pending verification found" });
  }

  try {
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({
        to: `+91${phoneNo}`,
        channel: "sms",
      });

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("❌ Resend OTP error:", err);
    res.status(500).json({ message: "Could not resend OTP" });
  }
};

// Step 2: Verify OTP and save user
exports.verifyOtp = async (req, res) => {
  const { phoneNo, otp } = req.body;

  const pendingUser = pendingUsers.get(phoneNo);
  if (!pendingUser) {
    return res.status(400).json({ message: "No pending user found" });
  }

  try {
    const result = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({
        to: `+91${phoneNo}`,
        code: otp,
      });

    if (result.status !== "approved") {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const newUser = new User({ ...pendingUser, isPhoneVerified: true });
    await newUser.save();

    pendingUsers.delete(phoneNo);

    res.status(200).json({ message: "Phone verified & user registered" });
  } catch (err) {
    console.error("❌ OTP verification failed:", err);
    res.status(500).json({ message: "OTP verification error" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    console.log("updateUser: req.user =", req.user); // Good for debugging
    console.log("updateUser: req.body =", req.body); // Good for debugging: See exactly what frontend sends

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: User ID missing' });
    }
    const userId = req.user.id;

    // Fetch the user. Populating might not be strictly necessary if you're updating by ID directly.
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Define allowed fields that can be updated directly on the User model
    // FIX: 'profilePicUrl' to match frontend, and 'contact1', 'contact2' added here.
    const ALLOWED_FIELDS = [
      'name',
      'securityCode',
      'profilePicUrl', // <-- CRITICAL FIX: Now matches your frontend
      'gender',
      'bloodGroup',
      'contact1',      // <-- ADDED: For direct update on User model
      'contact2'       // <-- ADDED: For direct update on User model
    ];
    const updates = {};

    for (let field of ALLOWED_FIELDS) {
      // Check if the field exists in req.body and is not undefined
      if (req.body.hasOwnProperty(field) && req.body[field] !== undefined) {
        updates[field] = field === 'securityCode'
          ? await bcrypt.hash(req.body[field], 10)
          : req.body[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }); // runValidators ensures schema validation
      console.log('User core fields updated:', updates);
    }

    if (req.body.emergencyAddresses && user.emergencyAddresses && user.emergencyAddresses.length > 0) {
        await EmergencyAddress.findByIdAndUpdate(user.emergencyAddresses[0]._id, req.body.emergencyAddresses, { new: true, runValidators: true });
        console.log('Emergency Address updated for:', user.emergencyAddresses[0]._id);
    }
   
    return res.status(200).json({ message: 'User updated successfully' });

  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    console.log("getMe: req.user =", req.user);
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: User ID missing' });
    }
    const user = await User.findById(req.user.id)
      .populate('emergencyContacts')
      .populate('emergencyAddresses')
      //.populate('recentRoutes') // Removed because recentRoutes is not in schema
      .select(
        '-password -deviceToken.token -deviceToken.updated_at -__v' // Exclude sensitive info and internal fields
      );

    console.log("getMe: user found =", user);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Step 3: Login
exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id); // This function is assumed to be defined and correctly generates a token

    // Determine token expiration based on rememberMe
    // Note: expiresIn is in seconds for maxAge in cookie, but needs to be in milliseconds for new Date()
    const expiresInSeconds = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30 days or 7 days
    const expiresInMs = expiresInSeconds * 1000;

    // Save refresh token to database
    await new RefreshToken({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + expiresInMs),
    }).save();

    // Set refresh token as an HTTP-only cookie
    // This is good for web browsers for security, but client-side app needs it in body too.
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure: true in production with HTTPS
      maxAge: expiresInMs,
    });

    // Send both accessToken and refreshToken in the JSON response body
    // This is crucial for your React Native app to store the refreshToken in AsyncStorage.
    res.status(200).json({
      accessToken,
      refreshToken, // <--- IMPORTANT FIX: Include refreshToken in the response body
      userData: { // Optional: include user data if your frontend needs it immediately after login
        id: user._id,
        email: user.email,
        // ... any other user fields you want to send
      }
    });

  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) return res.status(403).json({ message: "No token provided" });

  try {
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) return res.status(403).json({ message: "Invalid token" });

    const decoded = verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    if (!decoded) return res.status(403).json({ message: "Token expired or invalid" });

    const newAccessToken = generateAccessToken(decoded.userId);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("❌ Refresh Token Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

