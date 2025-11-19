const Tour = require('../models/tour.model');
const { upload, uploadToS3 } = require('../utils/s3Upload'); // Import utilities
const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config/config');
const Payment = require('../models/payment.model');

// Lazily create Razorpay instance so app can start without env vars during development
const getRazorpayInstance = () => {
  const keyId = config.razorpay.keyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = config.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    // Caller will handle the error
    return null;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// Middleware to use in your route: upload.single('photo') expects the file field name 'photo'
exports.uploadTourPhoto = upload.single('photo');

// Controller function to handle the image upload and database update
exports.createTourWithPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'fail', message: 'No image file provided.' });
    }

    // 1. Upload the in-memory buffer to S3
    const uploadResult = await uploadToS3(req.file);

    // 2. Create the Tour object using the returned public URL
    const newTour = await Tour.create({
      ...req.body, // Include other tour data from the form
      imageCover: uploadResult.publicUrl // Save the public URL to MongoDB
    });

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour
      }
    });
  } catch (err) {
    console.error('Create Tour Error:', err.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Image upload or tour creation failed. Check AWS credentials/Bucket policy.' 
    });
  }
};


// Function to get all tours
exports.getAllTours = async (req, res) => {
  try {
    // 1. EXECUTE QUERY: Find all documents in the Tour collection
    const tours = await Tour.find();

    // 2. SEND RESPONSE: Send success status and the data
    res.status(200).json({
      status: 'success',
      results: tours.length, // Good practice to include the count
      data: {
        tours // Array of tour objects
      }
    });
  } catch (err) {
    // Handle any database or server errors
    res.status(404).json({
      status: 'fail',
      message: err
    });
  }
};

// Create a Razorpay order for a user buying a tour
exports.createRazorpayOrder = async (req, res) => {
  try {
    // require authenticated user (middleware should set req.user)
    const user = req.user;
    if (!user) return res.status(401).json({ status: 'fail', message: 'Please authenticate' });

    const tourId = req.params.tourId;
    const tour = await Tour.findById(tourId);
    if (!tour) return res.status(404).json({ status: 'fail', message: 'Tour not found' });

    // Razorpay expects amount in the smallest currency unit (paise)
    const amount = Math.round((tour.price || 0) * 100);

    const options = {
      amount,
      currency: 'INR',
      receipt: `rcpt_${tour._id}_${user.id}`,
      payment_capture: 1,
    };

    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(500).json({ status: 'error', message: 'Razorpay keys not configured on server' });
    }

    const order = await razorpay.orders.create(options);

    // persist a Payment record in 'created' state
    await Payment.create({
      user: user.id,
      tour: tour._id,
      amount: tour.price,
      currency: 'INR',
      razorpayOrderId: order.id,
      status: 'created',
    });

    // send order + key id so the client can open checkout
    res.status(201).json({ status: 'success', data: { order, keyId: config.razorpay.keyId || process.env.RAZORPAY_KEY_ID } });
  } catch (err) {
    console.error('Razorpay create order error:', err.message);
    res.status(500).json({ status: 'error', message: 'Unable to create payment order' });
  }
};

// Verify Razorpay payment signature and mark payment as paid
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ status: 'fail', message: 'Missing payment verification fields' });
    }

    const secret = config.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto.createHmac('sha256', secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ status: 'fail', message: 'Invalid payment signature' });
    }

    // update the Payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, status: 'paid' },
      { new: true }
    );

    if (!payment) {
      // still return success to client but log it
      console.warn('Payment record not found for order:', razorpay_order_id);
      return res.status(200).json({ status: 'success', message: 'Payment verified but no local record found' });
    }

    // create a Booking linked to the payment (if not already created)
    const Booking = require('../models/booking.model');
    let booking = await Booking.findOne({ payment: payment._id });
    if (!booking) {
      booking = await Booking.create({
        user: payment.user,
        tour: payment.tour,
        price: payment.amount,
        paid: true,
        payment: payment._id,
      });
    }

    res.status(200).json({ status: 'success', data: { payment, booking } });
  } catch (err) {
    console.error('Razorpay verify error:', err.message);
    res.status(500).json({ status: 'error', message: 'Payment verification failed' });
  }
};