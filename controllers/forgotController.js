const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/user");

// Temporary in-memory storage for OTPs
const otpStore = new Map();

// Configure Gmail transporter (same as authController)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'shieldx.app@gmail.com', // Your email
    pass: 'ydha ebpb cbbb gwsy'  // App-specific password
  }
});

// Send OTP to email for password reset
exports.sendOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 minutes

    await transporter.sendMail({
      from: '"ShieldX Team" <shieldx.app@gmail.com>',
      to: email,
      subject: "ShieldX: Password Reset OTP",
      text: `Hi,

Use the following OTP to reset your password:

OTP: ${otp}

This OTP is valid for 5 minutes.

If you didn’t request this, please ignore this email.

– ShieldX Team`
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("❌ Send OTP Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Verify OTP for password reset
exports.verifyOtp = (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const stored = otpStore.get(email);
    if (!stored) return res.status(400).json({ message: "OTP expired or not requested" });

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (stored.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    res.status(200).json({ message: "OTP verified" });
  } catch (err) {
    console.error("❌ Verify OTP Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset password after OTP verification
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    const stored = otpStore.get(email);
    if (!stored) return res.status(400).json({ message: "OTP expired or not requested" });

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (stored.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Cleanup OTP after successful reset
    otpStore.delete(email);

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("❌ Reset Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
