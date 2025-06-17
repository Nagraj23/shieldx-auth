require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const emergencyRoutes = require("./routes/EmergencyRoutes");
// const emergencyContactRoutes = require("./routes/emergencyContactRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

connectDB(); // DB connect

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", authRoutes);
app.use("/emergency", emergencyRoutes);
// app.use("/contact", emergencyContactRoutes);

// Default route
app.get("/", (req, res) => res.send("Welcome to ShieldX Backend!"));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
