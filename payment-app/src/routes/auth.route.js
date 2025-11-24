// Routes removed — auth API now lives in outbound-backend/src/routes/v1/auth.route.js
const express = require('express');
const router = express.Router();
router.get('/', (req, res) => res.status(501).send({ message: 'Auth endpoints moved to main backend' }));
module.exports = router;
