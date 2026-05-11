const mongoose = require('mongoose');

const FilmSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    releaseYear: { type: Number },
    thumbnail: {
        url: { type: String },
        public_id: { type: String }
    },
    video: {
        url: { type: String }, 
        public_id: { type: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('Film', FilmSchema);