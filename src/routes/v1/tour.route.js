const express = require('express');
const tourController = require('../../controllers/tour.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.route('/')
  .get(tourController.getAllTours)
  // The POST route now uses both the Multer middleware and the controller
  .post(tourController.uploadTourPhoto, tourController.createTourWithPhoto); 

// Payment endpoints: create an order and verify payment
router.post('/:tourId/create-order', auth(), tourController.createRazorpayOrder);
router.post('/:tourId/verify-payment', auth(), tourController.verifyRazorpayPayment);

module.exports = router;