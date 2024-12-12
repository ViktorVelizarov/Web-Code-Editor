import mongoose from 'mongoose';

const userRoomSchema = new mongoose.Schema({
  socketId: String,
  roomId: String,
  username: String
});

export default mongoose.model('UserRoom', userRoomSchema);