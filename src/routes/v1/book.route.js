const router = require('express').Router();
const bookController = require('../../controllers/book.controller');

router.route('/').post(bookController.createBook).get(bookController.getBooks);

router.route('/:id').get(bookController.getBook).put(bookController.updateBook).delete(bookController.deleteBook);

module.exports = router;
