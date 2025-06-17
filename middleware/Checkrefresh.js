const jwt = require("jsonwebtoken"); // 
const RefreshToken = require("../models/RefreshToken"); // 
const { generateAccessToken, verifyToken } = require("../utils/tokenUtils"); // 

const refreshAndSetTokens = async (res, refreshToken, userIdFromToken) => {
  const storedToken = await RefreshToken.findOne({ token: refreshToken }); // 
  if (!storedToken) {
    console.log("Refresh token not found"); // 
    return { status: 403, message: "Refresh token not found" }; // 
  }

  let verifiedRefresh;
  try {
    verifiedRefresh = verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET); // 
  } catch (refreshErr) {
    console.log("Invalid refresh token"); // 
    return { status: 403, message: "Invalid refresh token" }; // 
  }

  // Ensure the userId from the refresh token matches the original access token's userId (if available)
  // This adds an extra layer of security.
  if (userIdFromToken && verifiedRefresh.userId !== userIdFromToken) {
      console.log("Mismatched user IDs during refresh.");
      return { status: 403, message: "Invalid refresh token payload" };
  }


  // Generate a new Access Token
  const newAccessToken = generateAccessToken(verifiedRefresh.userId); // 

  // Update headers to carry the new token
  res.setHeader("Authorization", `Bearer ${newAccessToken}`); // 

  // Set new access token in httpOnly cookie for client to update
  res.cookie("accessToken", newAccessToken, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    maxAge: 15 * 60 * 1000, // 15 minutes 
  });
  console.log("✅ New Access Token generated, set in headers and cookie."); // 

  // Additional logging for token refresh success
  console.log(`🔄 Token refreshed for userId: ${verifiedRefresh.userId}`);

  return { status: 200, userId: verifiedRefresh.userId, newAccessToken };
};


const checkRefresh = async (req, res, next) => {
  try {
    console.log("checkRefresh middleware called for path:", req.path);
    const authHeader = req.headers.authorization;
    console.log("checkRefresh middleware: authHeader =", authHeader);

    if (!authHeader) {
      console.log("Authorization header missing");
      return res.status(403).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    try {
      decoded = verifyToken(token, process.env.TOKEN_SECRET);
      console.log("Decoded token:", decoded);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        console.log("Access token expired, attempting to refresh...");
        // Try to get refresh token from cookies, headers, or body
        let refreshToken = req.cookies.refreshToken || req.headers['x-refresh-token'] || req.body.refreshToken;
        if (!refreshToken) {
          console.log("No refresh token provided");
          return res.status(403).json({ message: "No refresh token provided" });
        }

        const refreshResult = await refreshAndSetTokens(res, refreshToken, decoded?.userId);
        if (refreshResult.status !== 200) {
          return res.status(refreshResult.status).json({ message: refreshResult.message });
        }
        req.user = { id: refreshResult.userId };
        // Attach new access token to response header for frontend to update
        if (refreshResult.newAccessToken) {
          res.setHeader("x-new-access-token", refreshResult.newAccessToken);
        }
        console.log("req.user set to:", req.user);
        return next();
      } else {
        console.log("Invalid token");
        return res.status(403).json({ message: "Invalid token" });
      }
    }

    const expTimestamp = decoded.exp * 1000;
    const timeRemaining = expTimestamp - Date.now();

    // If the token is expiring in less than 5 minutes, refresh it
    if (timeRemaining < 5 * 60 * 1000) {
      console.log("🔄 Token is about to expire. Refreshing...");
      let refreshToken = req.cookies.refreshToken || req.headers['x-refresh-token'] || req.body.refreshToken;
      if (!refreshToken) {
        console.log("No refresh token provided");
        return res.status(403).json({ message: "No refresh token provided" });
      }

      const refreshResult = await refreshAndSetTokens(res, refreshToken, decoded.userId);
      if (refreshResult.status !== 200) {
        return res.status(refreshResult.status).json({ message: refreshResult.message });
      }
      // Note: No need to set req.user here, as it will be set below for all valid cases.
    }

    req.user = { id: decoded.userId };
    console.log("req.user set to:", req.user);
    next();
  } catch (error) {
    console.error("❌ Error in checkRefresh Middleware:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = checkRefresh;