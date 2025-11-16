const router = require('express').Router();
const countryController = require('../../controllers/country.controller');

// Define a route to get the list of countries
router.get('/', countryController.getCountries);

module.exports = router;