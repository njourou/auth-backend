const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const StellarSdk = require('stellar-sdk');
const User = require('../models/User');

// Helper function to create Stellar account
async function createStellarAccount() {
  const pair = StellarSdk.Keypair.random();
  return {
    publicKey: pair.publicKey(),
    secretKey: pair.secret(),
  };
}

// Updated register route
router.post('/register', async (req, res) => {
  try {
    const { phoneNumber, password, is_admin, is_staff } = req.body;

    // Check if user already exists
    let user = await User.findOne({ phoneNumber });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create Stellar account
    const stellarAccount = await createStellarAccount();

    // Create new user
    user = new User({
      phoneNumber,
      password,
      stellarPublicKey: stellarAccount.publicKey,
      stellarSecretKey: stellarAccount.secretKey,
      is_admin: is_admin || false,
      is_staff: is_staff || false,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user to database
    await user.save();

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id,
        stellarPublicKey: user.stellarPublicKey,
        is_admin: user.is_admin,
        is_staff: user.is_staff,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          stellarPublicKey: user.stellarPublicKey,
          is_admin: user.is_admin,
          is_staff: user.is_staff,
        });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Updated login route
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id,
        stellarPublicKey: user.stellarPublicKey,
        is_admin: user.is_admin,
        is_staff: user.is_staff,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          stellarPublicKey: user.stellarPublicKey,
          is_admin: user.is_admin,
          is_staff: user.is_staff,
        });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;