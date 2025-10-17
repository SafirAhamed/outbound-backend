const express = require('express');
const tourController = require('../../controllers/tour.controller');

const router = express.Router();

router.route('/')
  .get(tourController.getAllTours)
  // The POST route now uses both the Multer middleware and the controller
  .post(tourController.uploadTourPhoto, tourController.createTourWithPhoto); 

module.exports = router;