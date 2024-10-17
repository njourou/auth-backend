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

// Get players by team
router.get('/team/:teamName', async (req, res) => {
  try {
    const { teamName } = req.params;
    const players = await Player.find({ team: teamName });
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a player by ID
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { name, team, jerseyNumber, dateOfBirth, image } = req.body;

  try {
    const updatedPlayer = await Player.findByIdAndUpdate(
      id,
      { name, team, jerseyNumber, dateOfBirth, image },
      { new: true, runValidators: true }
    );

    if (!updatedPlayer) {
      return res.status(404).json({ message: 'Player not found' });
    }

    res.json(updatedPlayer);
  } catch (error) {
    res.status(400).json({ message: 'Error updating player' });
  }
});

// Delete a player by ID
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPlayer = await Player.findByIdAndDelete(id);

    if (!deletedPlayer) {
      return res.status(404).json({ message: 'Player not found' });
    }

    res.status(204).send(); // No content to send back
  } catch (error) {
    res.status(500).json({ message: 'Error deleting player' });
  }
});

module.exports = router;
