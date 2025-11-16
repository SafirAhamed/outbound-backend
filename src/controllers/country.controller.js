const Country = require('../models/country.model');
const catchAsync = require('../utils/catchAsync');

// GET /country - Fetch all countries
module.exports.getCountries = catchAsync(async (req, res) => {
  const countries = await Country.find({}, 'name code');
  res.status(200).json({ success: true, data: countries });
});
