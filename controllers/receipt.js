const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Receipt = require('../models/receipt');
const User = require('../models/user');

const Cloud = require('@google-cloud/storage')
const axios = require('axios');
const {Storage} = Cloud
const Tesseract = require('tesseract.js');
const cheerio = require('cheerio');
const pretty = require('pretty');
const fs = require('fs');
const path = require('path');
const os = require('os');

exports.scan = async (req, res) => {
    try {
        const storage = new Storage({
            keyFilename: './controllers/grounded-will-401605-b2323bae386c.json'
        });

        // Upload image to Google Cloud Storage
        const bucketName = 'receiptsfyp';
        const filename = `receipts/${Date.now()}.jpeg`;
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(filename);

        await file.save(req.file.buffer, {
            contentType: 'image/jpeg',
            public: true
        });

        const imageUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

        const base64Image = req.file.buffer.toString('base64');
        const gcfResponse = await axios.post('https://asia-southeast1-grounded-will-401605.cloudfunctions.net/ocrprocess-1', {
            image: {
                data: base64Image
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const processedImageBase64 = gcfResponse.data.image;

// Create a temporary file to store the processed image
const tempFilePath = path.join(os.tmpdir(), 'processed_image.png');
const imageBuffer = Buffer.from(processedImageBase64, 'base64');
fs.writeFileSync(tempFilePath, imageBuffer);


const resultText = await Tesseract.recognize(tempFilePath);
const lines = resultText.data.text.split('\n').filter(line => line.trim() !== '');

let title = lines[0];  // Assuming first non-empty line is the title

const datePattern = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
let dateMatch = resultText.data.text.match(datePattern);
let date = dateMatch ? new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`) : new Date();

const paymentPattern = /(credit|debit|visa|mastercard)/i;
let paymentMatch = resultText.data.text.match(paymentPattern);
let paymentType = paymentMatch ? "Card" : "Cash";

const totalPattern = /TOTAL\s+[\$£€¥]?(\d+\.\d{2})/i;
let totalMatch = resultText.data.text.match(totalPattern);
let total = totalMatch ? parseFloat(totalMatch[1]) : 0.00;
console.log("this is total" + total)


// if (title.toLowerCase() === 'jaya grocer') {
//     console.log("true")
//     itemRegex = /^(?!.*total|.*subtotal|.*qty|.*amount|.*quantity|.*change|.*rounding|.*discount|.*saving|.*debit)(.+?)\s+\d+\.\d{2}\s*x\s*(\d+\.\d{2})$/i;
// } 
const items = [];
if (title.toLowerCase() === 'jaya grocer') {
let resultText2 = resultText.data.text.replace(". ", ".");
resultText2 = resultText2.replace(".  ", ".");
resultText2 = resultText2.replace(" .", ".");
resultText2 = resultText2.replace("%", "x");
resultText2 = resultText2.replace("+", "");
resultText2 = resultText2.replace("-", "");
resultText2 = resultText2.replace("/", "");
const pattern = /(.+)\n(\d+(\.\d+)?)\s+([A-Za-z]+)\s+\d+(\.\d+)?x(\d+\.\s*\d{2})/g;

// Find all matches in the resultText
let matches;


while ((matches = pattern.exec(resultText2)) !== null) {
  items.push({
    name: matches[1],
    price: parseFloat(matches[6].replace(" ", ""))
  });
}
}else{
let itemRegex = /^(?!.*total|.*subtotal|.*qt|.*amount|.*quantity|.*change|.*rounding|.*discount|.*saving|.*debit)(.+)\s+[\$£€¥]?(\d+\.\d{2})$/i;
for (let i = 0; i < lines.length - 1; i += 2) {
    const name = lines[i];
    const match = itemRegex.exec(lines[i + 1]);
    if (match) {
        const price = parseFloat(match[2]); // Use match[2] for the price
        console.log(`Item: ${name}, Price: ${price}`);
        items.push({ name, price });
}
}
}


if (!title || !totalMatch || !paymentMatch) {
    const gcfResponse2 = await axios.post('https://asia-southeast1-grounded-will-401605.cloudfunctions.net/ocrprocess-2', {
        image: {
            data: base64Image
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const processedImageBase642 = gcfResponse2.data.image;

// Create a temporary file to store the processed image
const tempFilePath = path.join(os.tmpdir(), 'processed_image2.png');
const imageBuffer = Buffer.from(processedImageBase642, 'base64');
fs.writeFileSync(tempFilePath, imageBuffer);
const secondResultText = await Tesseract.recognize(tempFilePath);
    if (!title) {
        const linesSecondTry = secondResultText.data.text.split('\n').filter(line => line.trim() !== '');
        title = linesSecondTry[0];
    }
    if (!totalMatch) {
        totalMatch = secondResultText.data.text.match(totalPattern);
        total = totalMatch ? parseFloat(totalMatch[1]) : 0.00;
    }
    if (!paymentMatch) {
        paymentMatch = secondResultText.data.text.match(paymentPattern);
        paymentType = paymentMatch ? paymentMatch[0] : ""; 

    }
}


        const receiptData = {
            title: title,
            date: date,
            price: total,
            currency: "MYR",
            paymentType: paymentType,
            items: items,  // from previous code
            imageUrl: imageUrl,
            user: req.params.id
        };
        fs.unlinkSync(tempFilePath);
        const receipt = new Receipt(receiptData);
        await receipt.save();
 // Replace with the actual user ID
        await User.findByIdAndUpdate(req.params.id, { $push: { receipts: receipt._id } });

        res.json("done");

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error processing the image");
    }
};


exports.editReceipt = async (req, res) => {
    const receiptId = req.params.id;  // Assuming the receipt's ID is passed in the URL
    if (!receiptId) {
        return res.status(400).send({ error: "No receipt ID provided." });
    }

    try {
        // Find and update the receipt
        const updatedReceipt = await Receipt.findByIdAndUpdate(receiptId, req.body, {
            new: true,        // return the updated receipt
            runValidators: true  // run validations against new values
        });

        // If the receipt is not found
        if (!updatedReceipt) {
            return res.status(404).send({ error: "Receipt not found." });
        }
        // Return the updated receipt
        res.status(200).json(updatedReceipt);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error updating the receipt.");
    }
};

exports.deleteReceipt = async (req, res) => {
    const receiptId = req.params.id;

    if (!receiptId) {
        return res.status(400).send({ error: "No receipt ID provided." });
    }

    try {
        // Find and delete the receipt
        const deletedReceipt = await Receipt.findByIdAndDelete(receiptId);

        // If the receipt is not found
        if (!deletedReceipt) {
            return res.status(404).send({ error: "Receipt not found." });
        }

        // Remove the receipt ID from the user's receipts array
        const userId = deletedReceipt.user;
        await User.findByIdAndUpdate(userId, { $pull: { receipts: receiptId } });

        // Return a success message or the deleted receipt
        res.status(200).json({ message: "Receipt deleted successfully" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error deleting the receipt.");
    }
};

// Retrieve a specific receipt by ID
exports.getReceipt = async (req, res) => {
    const receiptId = req.params.id;

    try {
        const receipt = await Receipt.findById(receiptId);

        if (!receipt) {
            return res.status(404).send({ message: "Receipt not found." });
        }

        res.status(200).json(receipt);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error retrieving the receipt.");
    }
};

// Retrieve all receipts
exports.getAllReceipts = async (req, res) => {
    try {
        const userId = req.body.id
        const user = await User.findById(userId).populate('receipts');

        if (user) {
            res.status(200).json(user.receipts);
        } else {
            res.status(404).send("User not found.");
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error retrieving the user's receipts.");
    }
};


exports.addItem = async (req, res) => {
    try {
        // Assuming you send receiptId and item details in the request body
        const { receiptId, name, price } = req.body; 
        let item = {name: name,price:price}
        // Find the receipt by its ID
        const receipt = await Receipt.findById(receiptId);
        if (!receipt) {
            return res.status(404).send("Receipt not found.");
        }

        // Add the new item to the items array of the receipt
        receipt.items.push(item);
        // Save the updated receipt
        await receipt.save();

        res.status(200).json({
            message: "Item added successfully!",
            updatedReceipt: receipt
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error adding the item to the receipt.");
    }
};

exports.getItems = async (req, res) => {
    try {
        // Assuming you send receiptId in the request params
        const { receiptId } = req.params;

        // Find the receipt by its ID
        const receipt = await Receipt.findById(receiptId);
        if (!receipt) {
            return res.status(404).send("Receipt not found.");
        }

        // Retrieve and send all items belonging to the receipt
        const items = receipt.items;

        res.status(200).json({
            message: "Items retrieved successfully!",
            items,
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error retrieving items for the receipt.");
    }
};

exports.removeItem = async (req, res) => {
    try {
        // Assuming you send receiptId and itemId in the request body
        const { receiptId, itemId } = req.body;

        // Find the receipt by its ID
        const receipt = await Receipt.findById(receiptId);
        if (!receipt) {
            return res.status(404).send("Receipt not found.");
        }

        // Remove the item with the given itemId from the items array of the receipt
        const updatedItems = receipt.items.filter(item => item._id.toString() !== itemId);

        // Check if an item was actually removed (i.e., if lengths are different)
        if (updatedItems.length === receipt.items.length) {
            return res.status(404).send("Item not found in the receipt.");
        }

        receipt.items = updatedItems;

        // Save the updated receipt
        await receipt.save();

        res.status(200).json({
            message: "Item removed successfully!",
            updatedReceipt: receipt
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error removing the item from the receipt.");
    }
};


exports.compareItem = async (req, res) => {
    try {
      req.body.itemName = req.body.itemName.replace(/%/g, '');
      const response = await axios.get(
        `https://myaeon2go.com/products/search/${req.body.itemName}`
      );
      const $ = cheerio.load(response.data);
      const productList = $(".g-product-list").first();
      const productItems = productList.find("li").slice(0, 2);
      const data = [];
      const maxPrice = parseFloat(req.body.itemPrice);
      productItems.each((index, element) => {
        const itemName = $(element).find("a").first().attr("title");
        const priceText = $(element).text().trim();
        const rmText = priceText.match(/RM.*?(\d+(\.\d{1,2})?)/);
  
        // Check if rmText is valid and the price is less than maxPrice
        if (rmText && parseFloat(rmText[1]) < maxPrice) {
          data.push({
            itemName: pretty(itemName || "N/A"),
            priceText: pretty(rmText[0]),
            website: "Aeon"
          });
        }
      });

      const responsee = await axios.get(`https://jgsj.jayagrocer.com/search?type=product&options%5Bprefix%5D=last&q=${req.body.itemName}`)
  const $$ = cheerio.load(responsee.data);
  const productListt = $$('.product-list').first();
  const productItemss = productListt.find('.product-item').slice(0, 2);
  productItemss.each((index, element) => {
    const itemName = $$(element).find('.product-item__title').text();
    const priceText = $$(element).find('.price').text();
    const rmText = priceText.match(/RM.*?(\d+(\.\d{1,2})?)/);
    if (rmText && parseFloat(rmText[1]) < maxPrice) {
      data.push({
        itemName: pretty(itemName || "N/A"),
        priceText: pretty(rmText[0]),
        website: "Jaya Grocer"
      });
    }
  });
  
      res.json(data);
    } catch (error) {
        res.status(400).send('Bad Request');


      console.error("Error:", error.message);
    }
  };