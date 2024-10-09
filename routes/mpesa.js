const express = require('express');
const router = express.Router();
const axios = require('axios');
const Team = require('../models/teams');

// Utility function to generate timestamp
function getTimestamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

// Utility function to generate the password
function generatePassword(shortcode, passkey, timestamp) {
  const data = `${shortcode}${passkey}${timestamp}`;
  return Buffer.from(data).toString('base64');
}

// Endpoint to initiate M-Pesa STK Push for a team
router.post('/stk/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { phoneNumber } = req.body;

    // Fetch team details
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // M-Pesa API configuration
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    // Generate timestamp and password
    const timestamp = getTimestamp();
    const password = generatePassword(shortcode, passkey, timestamp);

    // Get access token
    const auth = await axios.get(
      'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        auth: {
          username: consumerKey,
          password: consumerSecret,
        },
      }
    );

    const token = auth.data.access_token;

    // Prepare STK Push request
    const stkPushRequest = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: team.amount,
      PartyA: phoneNumber,
      PartyB: shortcode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: team.name,
      TransactionDesc: `Payment for ${team.name}`,
    };

    // Make STK Push request
    const stkPushResponse = await axios.post(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPushRequest,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.status(200).json({
      message: 'STK Push initiated successfully',
      CheckoutRequestID: stkPushResponse.data.CheckoutRequestID,
      ResponseDescription: stkPushResponse.data.ResponseDescription,
    });

  } catch (error) {
    console.error('M-Pesa STK Push Error:', error);
    res.status(500).json({
      message: 'Error initiating M-Pesa payment',
      error: error.response?.data || error.message,
    });
  }
});

// Callback URL endpoint to handle M-Pesa response
router.post('/callback', async (req, res) => {
  try {
    const { Body } = req.body;
    
    if (Body.stkCallback.ResultCode === 0) {
      // Payment successful
      const { CallbackMetadata } = Body.stkCallback;
      
      // Extract payment details
      const amount = CallbackMetadata.Item.find(item => item.Name === 'Amount').Value;
      const mpesaReceiptNumber = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber').Value;
      const transactionDate = CallbackMetadata.Item.find(item => item.Name === 'TransactionDate').Value;
      const phoneNumber = CallbackMetadata.Item.find(item => item.Name === 'PhoneNumber').Value;

      console.log('Payment successful:', {
        amount,
        mpesaReceiptNumber,
        transactionDate,
        phoneNumber,
      });
    } else {
      // Payment failed
      console.log('Payment failed:', Body.stkCallback.ResultDesc);
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback received successfully' });
  } catch (error) {
    console.error('M-Pesa Callback Error:', error);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
});

module.exports = router;