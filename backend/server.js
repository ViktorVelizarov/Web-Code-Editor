import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import pkg from 'body-parser';
const { json } = pkg;
import chalk from 'chalk';

const { blueBright, redBright } = chalk;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: "https://collaborativecodeeditor-440923.lm.r.appspot.com",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

// MongoDB connection
mongoose.connect('mongodb+srv://viktorvelizarov1:RAJ96BJOusHZuAoM@cluster0.zr3t3.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log(blueBright.bold('Connected to MongoDB!'));
}).catch((err) => {
  console.error(redBright.bold('Error connecting to MongoDB'), err);
});

// Room schema
const roomSchema = new mongoose.Schema({
  roomId: String,
  users: [String],
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// UserRoom schema
const userRoomSchema = new mongoose.Schema({
  socketId: String,
  roomId: String,
  username: String
});

const UserRoom = mongoose.model('UserRoom', userRoomSchema);

app.use(json());
app.use(cors());

app.get('/', (req, res) => {
  res.send({ msg: 'hello world' });
});

// Create a new room with a user
app.post('/create-room-with-user', async (req, res) => {
  const { username } = req.body;
  const roomId = uuidv4();

  const room = new Room({
    roomId,
    users: [username],
    created: moment().toISOString(),
    updated: moment().toISOString()
  });

  await room.save();
  res.status(201).send({ roomId });
});

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Handle code changes
  socket.on('CODE_CHANGED', async (code) => {
    console.log("CODE_CHANGED event received from socket:", socket.id);
    
    const userSession = await UserRoom.findOne({ socketId: socket.id });
    if (userSession) {
      const { roomId } = userSession;
      console.log(`Broadcasting code to room: ${roomId}`);
      socket.to(roomId).emit('CODE_CHANGED', code);
    } else {
      console.log(`No room found for socket: ${socket.id}`);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(8080, () => {
  console.log('listening on *:8080');
});