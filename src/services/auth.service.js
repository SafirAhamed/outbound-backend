const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const Token = require('../models/token.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    const user = await userService.getUserById(verifyEmailTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
    await userService.updateUserById(user.id, { isEmailVerified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

// --- Simple OTP/session helpers (in-memory) -------------------------------
// Note: For production, move to persistent store (Redis) and integrate SMS provider.
const crypto = require('crypto');
const config = require('../config/config');
let twilioClient = null;
try {
  // require lazily so tests or environments without the package won't fail until used
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const Twilio = require('twilio');
  if (config.twilio && config.twilio.accountSid && config.twilio.authToken) {
    twilioClient = Twilio(config.twilio.accountSid, config.twilio.authToken);
  }
} catch (err) {
  // twilio not installed or misconfigured; we'll fallback to console logging
  twilioClient = null;
}

const otps = new Map(); // mobile -> { code, expiresAt }
const sessions = new Map(); // token -> { mobile, createdAt }

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

const sendOtp = async (mobile) => {
  const code = generateCode();
  const expiresAt = Date.now() + 1000 * 60 * 5; // 5 minutes
  otps.set(mobile, { code, expiresAt });

  // If Twilio configured, attempt to send SMS
  if (twilioClient && config.twilio && config.twilio.from) {
    try {
      await twilioClient.messages.create({
        body: `Your verification code is ${code}`,
        from: config.twilio.from,
        to: mobile,
      });
      return true;
    } catch (err) {
      // Log and fall back to console output
      console.error('[auth.service] Twilio send failed, falling back to console. Error:', err && err.message ? err.message : err);
    }
  }

  // Fallback: log OTP to server console (for dev/testing)
  console.info(`[auth.service] OTP for ${mobile}: ${code}`);
  return true;
};

const verifyOtp = async (mobile, code) => {
  const rec = otps.get(mobile);
  if (!rec) return null;
  if (Date.now() > rec.expiresAt) {
    otps.delete(mobile);
    return null;
  }
  if (String(code) !== rec.code) return null;
  otps.delete(mobile);
  const token = generateToken();
  sessions.set(token, { mobile, createdAt: Date.now() });
  return token;
};

module.exports = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
  // OTP helpers (development)
  sendOtp,
  verifyOtp,
};
