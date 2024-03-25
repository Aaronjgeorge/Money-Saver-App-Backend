const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const User = require('../models/receipt');
const receiptController = require('../controllers/receipt');
const isAuth = require('../middleware/is-auth');
const router = express.Router();
const storage = multer.memoryStorage(); // Store the file in memory as a buffer
const upload = multer({ storage: storage });



router.post('/preprocessocr/:id', upload.single('image'), receiptController.scan);
router.get('/receipt/:id', receiptController.getReceipt);
router.put('/:id', receiptController.editReceipt);
router.delete('/receipt/:id', receiptController.deleteReceipt);
// Route to get all receipts
router.post('/receipts', receiptController.getAllReceipts);

router.get('/items/:receiptId', receiptController.getItems);
//comparison routes 
// router.get("/items", receiptController.getItems);
router.post("/items", receiptController.addItem);
router.delete("/items", receiptController.removeItem);
router.post("/items/compare", receiptController.compareItem);

module.exports = router;
