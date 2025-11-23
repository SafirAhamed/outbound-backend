const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const setupGoogleStrategy = require('./config/passportGoogle');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');

const app = express();

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// Razorpay webhook: use raw body parser for the webhook endpoint so signatures can be verified
const webhookController = require('./controllers/webhook.controller');
app.post('/v1/webhooks/razorpay', express.raw({ type: 'application/json' }), webhookController.razorpayWebhook);


// Proxy /payment-app to a separate payment-app service (recommended for isolation)
const paymentAppProxy = require('./middlewares/payment');
app.use('/rzp', paymentAppProxy);

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// enable cors with credentials support for cookie-based auth
const corsOptions = {};
if (config.oauth && config.oauth.frontendUrl) {
  corsOptions.origin = config.oauth.frontendUrl;
} else {
  corsOptions.origin = true;
}
corsOptions.credentials = true;
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);
// register google strategy if configured
const googleStrategy = setupGoogleStrategy();
if (googleStrategy) passport.use('google', googleStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// v1 api routes
app.use('/v1', routes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
