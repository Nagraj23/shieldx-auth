// services/authService.js

const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const crypto = require('crypto');

// JWT token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = '7d'; // Standard refresh token expiry
const EXTENDED_REFRESH_TOKEN_EXPIRY = '30d'; // Extended "Remember Me" expiry

// Generate access token
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
};

// Generate refresh token
const generateRefreshToken = async (userId, rememberMe = false) => {
  // Create a secure random token
  const tokenValue = crypto.randomBytes(40).toString('hex');
  
  // Calculate expiration time
  const expiryDuration = rememberMe ? EXTENDED_REFRESH_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY;
  const expiresAt = new Date();
  
  // Add days based on the expiry string (e.g., "7d" or "30d")
  const days = parseInt(expiryDuration);
  expiresAt.setDate(expiresAt.getDate() + days);
  
  // Save the refresh token to the database
  const refreshToken = new RefreshToken({
    token: tokenValue,
    userId,
    expiresAt,
    isExtendedSession: rememberMe
  });
  
  await refreshToken.save();
  return tokenValue;
};

// Refresh the access token using a refresh token
const refreshAccessToken = async (refreshTokenValue) => {
  // Find the refresh token in the database
  const refreshTokenDoc = await RefreshToken.findOne({ token: refreshTokenValue });
  
  if (!refreshTokenDoc) {
    throw new Error('Invalid refresh token');
  }
  
  // Check if the token has expired
  if (refreshTokenDoc.expiresAt < new Date()) {
    await RefreshToken.deleteOne({ _id: refreshTokenDoc._id });
    throw new Error('Refresh token expired');
  }
  
  // Generate a new access token
  const accessToken = generateAccessToken(refreshTokenDoc.userId);
  
  return { accessToken };
};

// Silent refresh mechanism
const silentRefresh = async (refreshTokenValue) => {
  try {
    const result = await refreshAccessToken(refreshTokenValue);
    return result;
  } catch (error) {
    throw error;
  }
};

// Logout - invalidate the refresh token
const logout = async (refreshTokenValue) => {
  await RefreshToken.deleteOne({ token: refreshTokenValue });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  silentRefresh,
  logout
};