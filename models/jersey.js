const mongoose = require('mongoose');

const jerseySchema = new mongoose.Schema({
    teamName: { type: String, required: true },
    type: { type: String, required: true },
    playerName: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true }, // Base64 encoded image
});

module.exports = mongoose.model('Jersey', jerseySchema);
