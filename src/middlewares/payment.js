// Proxy /payment-app to a separate payment-app service (recommended for isolation)
// Set PAYMENT_APP_URL in your environment, e.g. PAYMENT_APP_URL=http://localhost:3000
const { createProxyMiddleware } = require('http-proxy-middleware');
const paymentAppTarget = process.env.PAYMENT_APP_URL || 'http://localhost:8000';

const paymentAppProxy = createProxyMiddleware({
    target: paymentAppTarget,
    changeOrigin: true,
    pathRewrite: { '^/rzp': '' },
    onProxyReq(proxyReq, req, res) {
      // Forward original Authorization header if present
      const authHeader = req.headers.authorization;
      if (authHeader) proxyReq.setHeader('Authorization', authHeader);
    },
  });
  
module.exports = paymentAppProxy;

// End of payment-app proxy middleware
// --- IGNORE ---
// Usage in src/app.js:
// const paymentAppProxy = require('./middlewares/payment');
// app.use('/payment-app', paymentAppProxy);