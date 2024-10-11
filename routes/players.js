const express = require('express');
const router = express.Router();
const Player = require('../models/player');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Get all players
router.get('/players', async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching players' });
  }
});

// Add a new player
router.post('/add', async (req, res) => {
  const { name, team, jerseyNumber, dateOfBirth, image } = req.body;

  const newPlayer = new Player({
    name,
    team,
    jerseyNumber,
    dateOfBirth,
    image,
  });

  try {
    const savedPlayer = await newPlayer.save();
    res.status(201).json(savedPlayer);
  } catch (error) {
    res.status(400).json({ message: 'Error adding player' });
  }
});
router.get('/team/:teamName', async (req, res) => {
  try {
      const { teamName } = req.params;
      const players = await Player.find({ team: teamName });
      res.status(200).json(players);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});
module.exports = router;
