const Tour = require('../models/tour.model');
const { upload, uploadToS3 } = require('../utils/s3Upload'); // Import utilities

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