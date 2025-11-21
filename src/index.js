const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');

// Helper to connect to MongoDB once and reuse the promise across invocations
let mongoConnectPromise = null;
const ensureDb = async () => {
  if (mongoConnectPromise) return mongoConnectPromise;
  mongoConnectPromise = mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
    logger.info('Connected to MongoDB');
    return mongoose;
  });
  return mongoConnectPromise;
};

// If running on Vercel (serverless), export a request handler instead of starting a server
if (process.env.VERCEL) {
  module.exports = async (req, res) => {
    try {
      await ensureDb();
      return app(req, res);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Serverless handler error', err && err.message ? err.message : err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  };
} else {
  // Local / traditional server start (unchanged)
  let server;
  ensureDb().then(() => {
    server = app.listen(config.port, () => {
      logger.info(`Listening to port ${config.port}`);
    });
  }).catch((err) => {
    logger.error('Failed to connect to MongoDB', err);
  });

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        logger.info('Server closed');
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  };

  const unexpectedErrorHandler = (error) => {
    logger.error(error);
    exitHandler();
  };

  process.on('uncaughtException', unexpectedErrorHandler);
  process.on('unhandledRejection', unexpectedErrorHandler);

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received');
    if (server) {
      server.close();
    }
  });
}
