const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  stellarPublicKey: {
    type: String,
    required: true,
  },
  stellarSecretKey: {
    type: String,
    required: true,
  },
  is_admin: {
    type: Boolean,
    default: false,
  },
  is_staff: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('User', UserSchema);