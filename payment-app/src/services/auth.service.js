// Auth service removed from payment-app. Use the main backend (outbound-backend/src/services/auth.service.js)
// This file intentionally left as a placeholder to avoid duplicate implementations.

module.exports = {
  // placeholder functions to avoid require errors if referenced elsewhere
  sendOtp: async () => {
    throw new Error('sendOtp not available in payment-app; use outbound-backend');
  },
  verifyOtp: async () => {
    throw new Error('verifyOtp not available in payment-app; use outbound-backend');
  },
};
