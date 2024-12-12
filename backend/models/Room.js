import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: String,
  users: [String],
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

export default mongoose.model('Room', roomSchema);