const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
  },
  confirmed:{
    type: Boolean,
    default: false
  },
  mobile:{
    type: String,
  },
  receipts: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Receipt'
    }
  ]
});

module.exports = mongoose.model('User', userSchema);
