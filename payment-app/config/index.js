const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

// Schema for environment variables
const envSchema = Joi.object({
  PAYMENT_APP_PORT: Joi.number().integer().min(1).max(65535).default(8000),
  MONGODB_URI: Joi.string().uri({ allowRelative: false }).default('mongodb://127.0.0.1:27017/payment-app'),
  RAZORPAY_KEY_ID: Joi.string().required(),
  RAZORPAY_KEY_SECRET: Joi.string().required(),
}).unknown();

const { error, value: env } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
  // eslint-disable-next-line no-console
  console.error('Environment validation error:');
  error.details.forEach((d) => {
    // eslint-disable-next-line no-console
    console.error('  -', d.message);
  });
  throw new Error('Invalid environment configuration');
}

module.exports = {
  port: env.PAYMENT_APP_PORT,
  mongodbUri: env.MONGODB_URI,
  razorpayKeyId: env.RAZORPAY_KEY_ID,
  razorpayKeySecret: env.RAZORPAY_KEY_SECRET,
};
