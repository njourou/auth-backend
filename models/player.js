
const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  team: { type: String, required: true },
  jerseyNumber: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  image: { type: String, required: true },
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
