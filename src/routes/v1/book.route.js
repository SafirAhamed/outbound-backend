const router = require('express').Router();
const bookController = require('../../controllers/book.controller');
const auth = require('../../middlewares/auth');

router.route('/').post(bookController.createBook).get(bookController.getBooks);

router.route('/:id').get(bookController.getBook).put(bookController.updateBook).delete(bookController.deleteBook);

// Purchase endpoint (requires authentication)
router.post('/:id/purchase', auth(), bookController.purchaseBook);

// Create payment order for a book (requires authentication). Frontend uses returned order to complete payment.
router.post('/:id/create-order', auth(), bookController.createBookOrder);

module.exports = router;
