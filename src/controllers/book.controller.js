const logger = require('../config/logger');
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

// Purchase a book (adds to user's purchasedBooks)
const purchaseBook = catchAsync(async (req, res) => {
  const user = req.user; // set by auth middleware
  const bookId = req.params.id;
  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  // Prevent duplicates
  const hasBook = user.purchasedBooks && user.purchasedBooks.some((b) => b.toString() === bookId);
  if (hasBook) {
    return res.status(200).json({ success: true, message: 'Book already purchased', data: user.purchasedBooks });
  }

  user.purchasedBooks = user.purchasedBooks || [];
  user.purchasedBooks.push(bookId);
  await user.save();

  res.status(200).json({ success: true, message: 'Book purchased', data: book });
});

// Export the purchaseBook function
exports.purchaseBook = purchaseBook;

// Create a Razorpay order for purchasing a book (proxied to payment-app). Returns order details for frontend.
const createBookOrder = catchAsync(async (req, res) => {
  const user = req.user;
  const bookId = req.params.id;
  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  // parse amount from book.price (string) to number
  const amount = Number.parseFloat(book.price);
  if (Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid book price' });
  }

  const paymentAppUrl = require('../config/config').paymentAppUrl;

  // call payment-app to create an order
  const createOrderUrl = `${paymentAppUrl.replace(/\/$/, '')}/v1/payments/create-order`;
  logger.info(`Creating book order via payment app at ${createOrderUrl}`);
  const resp = await fetch(createOrderUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: `book_${Date.now()}`,
      notes: { bookId, userId: user.id },
    }),
  });

  if (!resp.ok) {
    try {
      const errorBody = await resp.json();
      logger.error('Payment app create order error:', errorBody);
    } catch (e) {
      logger.error('Payment app create order error, non-JSON response');
    }
    const body = await resp.text();
    return res.status(502).json({ success: false, message: 'Payment provider error', details: body });
  }

  const order = await resp.json();
  logger.info(`Created book order ${order.id} for user ${user.id} and book ${bookId}`);

  // create Payment document in main app to track order and associate book
  const Payment = require('../models/payment.model');
  const paymentDoc = await Payment.create({
    user: user.id,
    amount: Math.round(amount * 100) / 100,
    currency: order.currency || 'INR',
    razorpayOrderId: order.id,
    status: 'created',
    book: bookId,
  });

  res.status(201).json({ success: true, order, payment: paymentDoc });
});

exports.createBookOrder = createBookOrder;
