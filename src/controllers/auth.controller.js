const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService } = require('../services');

const config = require('../config/config');

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);

  // set HttpOnly cookie for access token
  const cookieName = (config.cookie && config.cookie.name) || 'accessToken';
  const maxAge = new Date(tokens.access.expires).getTime() - Date.now();
  const cookieOptions = {
    httpOnly: true,
    secure: !!(config.cookie && config.cookie.secure),
    maxAge: Math.max(0, maxAge),
  };
  if (config.cookie && config.cookie.domain) cookieOptions.domain = config.cookie.domain;
  if (config.env === 'production') cookieOptions.sameSite = 'None';

  res.cookie(cookieName, tokens.access.token, cookieOptions);

  res.status(httpStatus.CREATED).send({ user });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);

  // set HttpOnly cookie for access token
  const cookieName = (config.cookie && config.cookie.name) || 'accessToken';
  const maxAge = new Date(tokens.access.expires).getTime() - Date.now();
  const cookieOptions = {
    httpOnly: true,
    secure: !!(config.cookie && config.cookie.secure),
    maxAge: Math.max(0, maxAge),
  };
  if (config.cookie && config.cookie.domain) cookieOptions.domain = config.cookie.domain;
  if (config.env === 'production') cookieOptions.sameSite = 'None';

  res.cookie(cookieName, tokens.access.token, cookieOptions);

  res.send({ user });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  // clear cookie
  const cookieName = (config.cookie && config.cookie.name) || 'accessToken';
  res.clearCookie(cookieName);
  res.status(httpStatus.NO_CONTENT).send();
});

const logoutCookie = catchAsync(async (req, res) => {
  // Clear the auth cookie. Optionally remove refresh token if provided.
  const cookieName = (config.cookie && config.cookie.name) || 'accessToken';
  try {
    if (req.body && req.body.refreshToken) {
      await authService.logout(req.body.refreshToken);
    }
  } catch (err) {
    // ignore errors when attempting to remove refresh token; still clear cookie
  }
  res.clearCookie(cookieName);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendOtp = catchAsync(async (req, res) => {
  const { mobile } = req.body || {};
  if (!mobile) return res.status(httpStatus.BAD_REQUEST).json({ message: 'mobile is required' });
  await authService.sendOtp(mobile);
  res.status(httpStatus.OK).send({ success: true, message: 'OTP sent' });
});

const verifyOtp = catchAsync(async (req, res) => {
  const { mobile, otp } = req.body || {};
  if (!mobile || !otp) return res.status(httpStatus.BAD_REQUEST).json({ message: 'mobile and otp are required' });
  const token = await authService.verifyOtp(mobile, otp);
  if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: 'Invalid or expired OTP' });
  // set session cookie (httpOnly) and return token in body for convenience
  res.cookie('session_token', token, { httpOnly: true, sameSite: 'lax' });
  res.status(httpStatus.OK).send({ success: true, token });
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  logoutCookie,
  sendOtp,
  verifyOtp,
};
