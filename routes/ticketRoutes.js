const express = require('express');
const router = express.Router();
const Ticket = require('../models/tickets'); 
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); 

router.post('/add', async (req, res) => {
  try {
    const newTicket = new Ticket(req.body);
    await newTicket.save();
    res.status(201).json(newTicket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.get('/', async (req, res) => {
    try {
      const tickets = await Ticket.find()
        .populate('homeTeam') // Populate team names
        .populate('awayTeam');
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching tickets' });
    }
  });
module.exports = router;
