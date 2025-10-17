const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema(
  {
    // --- BASIC INFORMATION ---
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less than or equal to 40 characters'],
      minlength: [10, 'A tour name must have more than or equal to 10 characters']
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // 4.666 -> 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },

    // --- PRICING & SLUGS ---
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        // 'this' only points to current doc on NEW document creation, not update
        validator: function(val) {
          return val < this.price; 
        },
        message: 'Discount price ({VALUE}) should be less than the regular price'
      }
    },
    slug: {
      type: String
      // This is typically generated using a pre-save hook from the 'name' field
    },

    // --- DESCRIPTION & S3 IMAGE UPLOAD ---
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary']
    },
    description: {
      type: String,
      trim: true
    },
    // The URL returned from AWS S3, Firebase, or Cloudinary
    imageCover: { 
      type: String, 
      required: [true, 'A tour must have a cover image URL'] 
    },
    images: [String], // Array of additional image URLs
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false // Hide this field from the final output
    },
    startDates: [Date], // Dates when the tour starts
    secretTour: {
      type: Boolean,
      default: false
    }
  },
  {
    // Options for the schema
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- INDEXING (Improves read performance) ---
// Indexing the price for efficient sorting and filtering
tourSchema.index({ price: 1, ratingsAverage: -1 }); 
// Indexing the slug for fast retrieval by name
tourSchema.index({ slug: 1 }); 

// --- VIRTUAL PROPERTIES ---
// Virtual property for week duration (not saved to DB)
tourSchema.virtual('durationWeeks').get(function() {
  if (this.duration) {
    return this.duration / 7;
  }
  return undefined;
});

// --- DOCUMENT MIDDLEWARE (Pre-save hook for slug generation) ---
// This runs BEFORE .save() and .create()
const slugify = require('slugify');

tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;