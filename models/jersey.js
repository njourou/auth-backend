const mongoose = require('mongoose');

const jerseySchema = new mongoose.Schema({
    teamName: { type: String, required: true },
    type: { type: String, required: true },
    playerName: { type: String, required: false },
    price: { type: Number, required: true },
    image: { type: String, required: true },
});

const Jersey = mongoose.model('Jersey', jerseySchema);
module.exports = Jersey;
