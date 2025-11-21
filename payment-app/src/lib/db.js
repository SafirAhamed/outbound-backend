const mongoose = require('mongoose');

async function connectDB(uri, opts = {}) {
  const options = { useNewUrlParser: true, useUnifiedTopology: true, ...opts };

  try {
    await mongoose.connect(uri, options);
    // eslint-disable-next-line no-console
    console.log('MongoDB connected:', uri);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err && err.message ? err.message : err);
    throw err;
  }

  // Optional: handle connection events
  mongoose.connection.on('error', (e) => {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error (event):', e && e.message ? e.message : e);
  });

  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('MongoDB disconnected');
  });

  return mongoose;
}

function closeDB() {
  return mongoose.disconnect();
}

module.exports = {
  connectDB,
  closeDB,
  mongoose,
};
