const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const receiptSchema = new Schema({
  title: {
    type: String,
    default: "Title",
  },
  date:{
    type: Date,
    required: true
  },
  currency:{
    type: String,
    default: "MYR"
  },
  price: {
    type: Number,
    default: 20,
  },
  description: {
    type: String,
  },
  imageUrl: {
    type: String,
    required: true
  },
  category:{
    type: String,
    default: "Food",
  },
  paymentType:{
    type: String,
    default: "Cash",
  },
  user: 
    {
      type: Schema.Types.ObjectId,
      ref: 'User', 
      required: true,
    },
  items: [
    {
      name: String,
      price: Number
    }
  ]
});

module.exports = mongoose.model('Receipt', receiptSchema);