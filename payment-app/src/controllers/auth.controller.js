// Controller removed from payment-app. Use central outbound-backend auth controller instead.
module.exports = {
  sendOtp: async (req, res) => res.status(501).send({ message: 'Not implemented in payment-app' }),
  verifyOtp: async (req, res) => res.status(501).send({ message: 'Not implemented in payment-app' }),
  googleAuth: async (req, res) => res.status(501).send({ message: 'Not implemented in payment-app' }),
};
