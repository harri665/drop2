const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  title: { type: String, default: '' },
  type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  filename: { type: String },
  originalName: { type: String },
  mimeType: { type: String },
  fileSize: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

noteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Note', noteSchema);
