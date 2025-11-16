const Book = require('../models/book.model');
const catchAsync = require('../utils/catchAsync');

// Create a new book
exports.createBook = catchAsync(async (req, res) => {
  const book = await Book.create(req.body);
  res.status(201).json({ success: true, data: book });
});

// Get all books with optional search and pagination
exports.getBooks = catchAsync(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  let filter = {};
  if (search) {
    filter = {
      $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }],
    };
  }
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const books = await Book.find(filter).skip(skip).limit(parseInt(limit, 10));
  const total = await Book.countDocuments(filter);
  res.status(200).json({
    success: true,
    data: books,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    totalPages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// Get a single book by ID
exports.getBook = catchAsync(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }
  res.status(200).json({ success: true, data: book });
});

// Update a book by ID
exports.updateBook = catchAsync(async (req, res) => {
  const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }
  res.status(200).json({ success: true, data: book });
});

// Delete a book by ID
exports.deleteBook = catchAsync(async (req, res) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }
  res.status(204).json({ success: true, data: null });
});
