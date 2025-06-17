const express = require("express");
const router = express.Router();
const emergencyController = require("../controllers/emergencyController");
console.log("🚨 emergencyController:", emergencyController);
const verifyToken = require("../middleware/VerifyToken");
const checkRefresh = require("../middleware/Checkrefresh");

// 🛡️ Apply middlewares in sequence: Verify, then Refresh if needed
router.use(verifyToken, checkRefresh);

// Emergency Contact Routes
router.post("/contact", emergencyController.addEmergencyContact);
router.get("/contact", emergencyController.getEmergencyContacts);
router.put("/contact", emergencyController.updateEmergencyContact);

// Emergency Address Routes
router.post("/address", emergencyController.addEmergencyAddress);
router.get("/address", emergencyController.getEmergencyAddress);
router.put("/address", emergencyController.updateEmergencyAddress);

module.exports = router;
