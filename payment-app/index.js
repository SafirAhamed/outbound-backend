const fs = require('fs');
const path = require('path');

// Simple static handler for the payment-app directory
const PUBLIC_DIR = path.join(__dirname);

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

module.exports = async (req, res) => {
  try {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
    // prevent directory traversal
    urlPath = path.normalize(urlPath).replace(/^\.+/, '');
    const filePath = path.join(PUBLIC_DIR, urlPath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mime[ext] || 'application/octet-stream';
    const data = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.statusCode = 200;
    res.end(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('payment-app handler error', err && err.message ? err.message : err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};
