const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const forgotController = require("../controllers/forgotController");
// const userController = require("../controllers/userController"); // 👈 Add this
const checkRefresh = require("../middleware/Checkrefresh");

// ────────────── Auth Routes ────────────── //
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/resend-otp", authController.resendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.get("/user/me", checkRefresh, authController.getMe);
// router.patch("/user-update", checkRefresh, authController.updateUser);

// ────────────── Forgot Password Routes ────────────── //
router.post("/forgot/send-otp", forgotController.sendOtp);
router.post("/forgot/verify-otp", forgotController.verifyOtp);
router.post("/forgot/reset-password", forgotController.resetPassword);

// ────────────── Protected Routes ────────────── //
router.use(checkRefresh); // 🛡️ Authentication Middleware

// ✅ User Update Route
router.patch("/user-update", authController.updateUser); // 👈 Now correctly routes

module.exports = router;
