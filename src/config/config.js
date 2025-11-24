const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    RAZORPAY_KEY_ID: Joi.string().description('Razorpay Key ID'),
    RAZORPAY_KEY_SECRET: Joi.string().description('Razorpay Key Secret'),
    GOOGLE_CLIENT_ID: Joi.string().description('Google OAuth Client ID'),
    GOOGLE_CLIENT_SECRET: Joi.string().description('Google OAuth Client Secret'),
    GOOGLE_CALLBACK_URL: Joi.string().description('Google OAuth callback URL (backend)'),
    FRONTEND_URL: Joi.string().description('Frontend base URL for redirects'),
    COOKIE_NAME: Joi.string().description('Name of the auth cookie'),
    COOKIE_SECURE: Joi.boolean().description('Whether auth cookie should be secure'),
    COOKIE_DOMAIN: Joi.string().description('Domain for auth cookie'),
    PAYMENT_APP_URL: Joi.string().description('Payment app base URL'),
    TWILIO_ACCOUNT_SID: Joi.string().description('Twilio account SID'),
    TWILIO_AUTH_TOKEN: Joi.string().description('Twilio auth token'),
    TWILIO_FROM: Joi.string().description('Twilio phone number to send SMS from'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  razorpay: {
    keyId: envVars.RAZORPAY_KEY_ID,
    keySecret: envVars.RAZORPAY_KEY_SECRET,
  },
  oauth: {
    google: {
      clientId: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
      callbackUrl: envVars.GOOGLE_CALLBACK_URL,
    },
    frontendUrl: envVars.FRONTEND_URL,
  },
  twilio: {
    accountSid: envVars.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID,
    authToken: envVars.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN,
    from: envVars.TWILIO_FROM || process.env.TWILIO_FROM,
  },
  cookie: {
    name: envVars.COOKIE_NAME || 'accessToken',
    secure: envVars.COOKIE_SECURE === 'true' || envVars.NODE_ENV === 'production',
    domain: envVars.COOKIE_DOMAIN || undefined,
  },
  paymentAppUrl: envVars.PAYMENT_APP_URL || process.env.PAYMENT_APP_URL || 'http://localhost:8000',
};
