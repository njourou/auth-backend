const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Jersey = require('../models/jersey');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    },
});

router.use(authMiddleware);

// Endpoint to add a new jersey
router.post('/add', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Image file is required' });
        }

        // Convert image buffer to Base64 string
        const imageBuffer = req.file.buffer.toString('base64');

        // Construct the jersey object
        const jerseyData = {
            teamName: req.body.teamName,
            type: req.body.type,
            playerName: req.body.playerName,
            price: req.body.price,
            image: imageBuffer, // Save Base64 string in MongoDB
        };

        const jersey = new Jersey(jerseyData);
        await jersey.save();

        res.status(201).json({
            message: 'Jersey added successfully',
            jersey,
        });
    } catch (error) {
        console.error('Error adding jersey:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to retrieve all jerseys
router.get('/', async (req, res) => {
    try {
        const jerseys = await Jersey.find();
        res.status(200).json(jerseys);
    } catch (error) {
        console.error('Error retrieving jerseys:', error.message);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
