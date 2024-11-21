const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stellar = require('@stellar/stellar-sdk');
const User = require('../models/User');
const axios = require('axios');


const server = new stellar.Horizon.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = stellar.Networks.TESTNET;

async function createStellarAccount() {
  try {
    const pair = stellar.Keypair.random();
    return {
      publicKey: pair.publicKey(),
      secretKey: pair.secret(),
      success: true
    };
  } catch (error) {
    console.error('Error creating Stellar account:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Fund Stellar account
async function fundStellarAccount(publicKey) {
  const friendbotUrl = `https://friendbot.stellar.org?addr=${publicKey}`;
  try {
    const response = await axios.get(friendbotUrl);
    console.log(`Funded account: ${publicKey}`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Funding error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}


async function handleStellarTransaction(stellarAccount) {
  try {
    if (!process.env.STELLAR_SECRET) {
      console.error('STELLAR_SECRET environment variable is not set');
      return { success: false, error: 'Stellar configuration error' };
    }

    const sourceKeypair = stellar.Keypair.fromSecret(process.env.STELLAR_SECRET);
    const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

    console.log('Source account loaded successfully');

 
    const sponsoredPublicKey = stellarAccount.publicKey;

   
    const usdcAsset = new stellar.Asset('USDC');

 
    const transaction = new stellar.TransactionBuilder(sourceAccount, {
      fee: await server.fetchBaseFee(),
      networkPassphrase,
    })
      .addOperation(
        stellar.Operation.beginSponsoringFutureReserves({
          sponsoredId: sponsoredPublicKey, 
        })
      )
      .addOperation(
        stellar.Operation.changeTrust({
          asset: usdcAsset, 
          limit: '1000', 
          source: sponsoredPublicKey 
        })
      )
      .addOperation(
        stellar.Operation.payment({
          source: sourceKeypair.publicKey(), 
          destination: sponsoredPublicKey, 
          asset: usdcAsset, 
          amount: '10',
        })
      )
      .addOperation(
        stellar.Operation.endSponsoringFutureReserves({
          source: sponsoredPublicKey, 
        })
      )
      .setTimeout(180)
      .build();

    // Sign the trans
    transaction.sign(sourceKeypair);
    transaction.sign(stellar.Keypair.fromSecret(stellarAccount.secretKey)); 

    console.log('Transaction built and signed, attempting submission...');

    try {
      const transactionResult = await server.submitTransaction(transaction);
      console.log('Transaction submitted successfully:', transactionResult);
      return { success: true, data: transactionResult };
    } catch (submitError) {
      console.error('Transaction submission error:', {
        message: submitError.message,
        resultCodes: submitError.response?.data?.extras?.result_codes,
        status: submitError.response?.status,
        statusText: submitError.response?.statusText
      });
      return { 
        success: false, 
        error: 'Transaction submission failed',
        details: submitError.response?.data?.extras?.result_codes || submitError.message
      };
    }
  } catch (error) {
    console.error('Stellar transaction setup error:', error);
    return { 
      success: false, 
      error: 'Failed to setup Stellar transaction',
      details: error.message
    };
  }
}

// Register route
router.post('/register', async (req, res) => {
  try {
    const { phoneNumber, password, is_admin, is_staff } = req.body;

    // Inpu
    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        msg: 'Phone number and password are required'
      });
    }

    // Check for existing user
    let user = await User.findOne({ phoneNumber });
    if (user) {
      return res.status(400).json({
        success: false,
        msg: 'User already exists'
      });
    }

    // Create Stellar account
    const stellarAccount = await createStellarAccount();
    if (!stellarAccount.success) {
      return res.status(500).json({
        success: false,
        msg: 'Failed to create Stellar account',
        error: stellarAccount.error
      });
    }

    // Fund the account
    const fundingResult = await fundStellarAccount(stellarAccount.publicKey);
    if (!fundingResult.success) {
      return res.status(500).json({
        success: false,
        msg: 'Failed to fund Stellar account',
        error: fundingResult.error
      });
    }

    // Handle Stellar transaction (sponsorship, trustline, payment)
    const transactionResult = await handleStellarTransaction(stellarAccount);
    console.log('Stellar transaction result:', transactionResult);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      phoneNumber,
      password: hashedPassword,
      stellarPublicKey: stellarAccount.publicKey,
      stellarSecretKey: stellarAccount.secretKey,
      is_admin: is_admin || false,
      is_staff: is_staff || false,
    });

    // Save user
    await user.save();

    // Create JWT token
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
        if (err) {
          console.error('JWT signing error:', err);
          return res.status(500).json({
            success: false,
            msg: 'Error generating authentication token'
          });
        }
        
        return res.status(200).json({
          success: true,
          token,
          user: {
            phoneNumber: user.phoneNumber,
            stellarPublicKey: user.stellarPublicKey,
            is_admin: user.is_admin,
            is_staff: user.is_staff
          },
          stellarStatus: transactionResult.success ? 'complete' : 'partial'
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      msg: 'Server error during registration',
      error: error.message
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

  
    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        msg: 'Phone number and password are required'
      });
    }

    // Find user
    let user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid credentials'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid credentials'
      });
    }

    // Create token payload
    const payload = {
      user: {
        id: user.id,
        stellarPublicKey: user.stellarPublicKey,
        is_admin: user.is_admin,
        is_staff: user.is_staff,
      },
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) {
          console.error('JWT signing error:', err);
          return res.status(500).json({
            success: false,
            msg: 'Error generating authentication token'
          });
        }
        
        return res.status(200).json({
          success: true,
          token,
          user: {
            phoneNumber: user.phoneNumber,
            stellarPublicKey: user.stellarPublicKey,
            is_admin: user.is_admin,
            is_staff: user.is_staff
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      msg: 'Server error during login',
      error: error.message
    });
  }
});

module.exports = router;
