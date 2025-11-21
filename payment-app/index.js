const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const config = require('./src/config');
// validators are applied in the route definitions

/* eslint-disable camelcase */

const app = express();

const { port, mongodbUri } = config;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from payment-app directory
app.use(express.static(path.join(__dirname, 'public')));


mongoose.set('strictQuery', false);
// Connect to MongoDB before handling requests
const { connectDB } = require('./src/lib/db');

connectDB(mongodbUri).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to connect to MongoDB, exiting:', err && err.message ? err.message : err);
  process.exit(1);
});

// Mount payment routes
const paymentRoutes = require('./src/routes/payment.route');

app.use('/', paymentRoutes);

// Route to serve the success page
app.get('/payment-success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// verify payment route moved to router

// Centralized error handler
/* eslint-disable-next-line no-unused-vars */
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: err && err.message ? err.message : 'Internal Server Error' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Payment app listening on port ${port}`);
});

module.exports = app;
