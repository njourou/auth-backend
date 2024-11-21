const express = require('express');
const multer = require('multer');
const path = require('path');
const Jersey = require('../models/jersey');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
router.use(authMiddleware);
// Endpoint to add a new jersey
router.post('/add', upload.single('image'), async (req, res) => {
    try {
        const jerseyData = {
            teamName: req.body.teamName,
            type: req.body.type,
            playerName: req.body.playerName,
            price: req.body.price,
            image: req.file.path, // Store the image path
        };
        const jersey = new Jersey(jerseyData);
        await jersey.save();
        res.status(201).json(jersey);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.get('/', async (req, res) => {
    try {
        const jerseys = await Jersey.find();
        console.log('Retrieved Jerseys:', jerseys);
        res.status(200).json(jerseys);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
module.exports = router;
