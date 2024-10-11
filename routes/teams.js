const express = require('express');
const router = express.Router();
const Team = require('../models/teams');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Endpoint to create a new team
router.post('/add', async (req, res) => {
    try {
      const { name, issuer, description, logo, ipfsHash, amount } = req.body;
  
      const newTeam = new Team({
        name,
        issuer,
        description,
        logo,
        ipfsHash,
        amount // Added amount field
      });
  
      const savedTeam = await newTeam.save();
      res.status(201).json(savedTeam);
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        res.status(400).json({ message: 'Team with this name already exists' });
      } else {
        res.status(500).json({ message: 'Error creating team', error: error.message });
      }
    }
});

// Endpoint to get all teams
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find();
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving teams', error: error.message });
  }
});

// Endpoint to get a team by ID
router.get('/teams/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving team', error: error.message });
  }
});

// New endpoint to update team amount
router.patch('/teams/:id/amount', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  try {
    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      { amount },
      { new: true, runValidators: true }
    );

    if (!updatedTeam) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.status(200).json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: 'Error updating team amount', error: error.message });
  }
});

module.exports = router;