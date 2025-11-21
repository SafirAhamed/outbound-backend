const { body, validationResult } = require('express-validator');

const createOrderRules = [
  body('amount')
    .exists().withMessage('amount is required')
    .bail()
    .isFloat({ gt: 0 }).withMessage('amount must be a number greater than 0'),
  body('currency').optional().isString(),
  body('receipt').optional().isString(),
];

const verifyPaymentRules = [
  body('razorpay_order_id').exists().withMessage('razorpay_order_id is required'),
  body('razorpay_payment_id').exists().withMessage('razorpay_payment_id is required'),
  body('razorpay_signature').exists().withMessage('razorpay_signature is required'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

module.exports = {
  createOrderRules,
  verifyPaymentRules,
  validate,
};
