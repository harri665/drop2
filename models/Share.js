const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
  slug: { type: String, unique: true, required: true },
  type: { type: String, enum: ['note', 'file', 'image'], required: true },
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Share', shareSchema);
