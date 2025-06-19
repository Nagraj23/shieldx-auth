// config/db.js
const mongoose = require("mongoose");
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://shieldxapp:GGwxgsebhZfYJONq@cluster0.uma7f0p.mongodb.net/ShieldX";


const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
