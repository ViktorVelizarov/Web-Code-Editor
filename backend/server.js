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

const { blueBright, greenBright, redBright } = chalk;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: "https://collaborativecodeeditor-440923.lm.r.appspot.com",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'] // WebSocket as primary, fallback to polling
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

// Define Mongoose schemas and models

// Room schema
const roomSchema = new mongoose.Schema({
  roomId: String,
  users: [String],
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// UserRoom schema (to track socketId, roomId, and username)
const userRoomSchema = new mongoose.Schema({
  socketId: String,
  roomId: String,
  username: String
});

const UserRoom = mongoose.model('UserRoom', userRoomSchema);

app.use(json());
app.use(cors());

app.use((req, res, next) => {
    if (req.originalUrl === '/favicon.ico') {
      res.status(204).end(); // Send 204 No Content
    } else {
      next(); // Proceed with other routes
    }
  });

app.get('/', (req, res) => {
  res.send({ msg: 'hello world' });
});

// Create a new room with a user
app.post('/create-room-with-user', async (req, res) => {
  const { username } = req.body;
  const roomId = uuidv4();

  // Create a new room document in MongoDB
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
    
    // Retrieve roomId from the UserRoom collection using socket.id
    const userSession = await UserRoom.findOne({ socketId: socket.id });
    if (userSession) {
      const { roomId } = userSession;
      console.log(`Broadcasting code to room: ${roomId}`);
      socket.to(roomId).emit('CODE_CHANGED', code);
    } else {
      console.log(`No room found for socket: ${socket.id}`);
    }
  });

  // Handle connection to room
  socket.on('CONNECTED_TO_ROOM', async ({ roomId, username }) => {
    // Store socketId, roomId, and username in the UserRoom collection
    await UserRoom.create({ socketId: socket.id, roomId, username });

    // Find users in the same room
    const usersInRoom = await UserRoom.find({ roomId }).select('username -_id');
    const userList = usersInRoom.map(user => user.username);
    
    // Join the socket to the room
    socket.join(roomId);
    
    console.log(`User ${username} connected to room: ${roomId}`);
    io.in(roomId).emit('ROOM:CONNECTION', userList);
  });

  // Handle socket disconnection
  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);

    // Find and remove the user from the UserRoom collection
    const userSession = await UserRoom.findOneAndDelete({ socketId: socket.id });
    if (userSession) {
      const { roomId, username } = userSession;
      
      // Find remaining users in the room
      const remainingUsers = await UserRoom.find({ roomId }).select('username -_id');
      const userList = remainingUsers.map(user => user.username);

      if (userList.length === 0) {
        // Optionally delete the room if no users are left
        await Room.deleteOne({ roomId });
        console.log(`Room ${roomId} deleted as no users are left`);
      } else {
        console.log(`User ${username} disconnected from room: ${roomId}`);
        io.in(roomId).emit('ROOM:CONNECTION', userList);
      }
    } else {
      console.log(`No session found for socket: ${socket.id}`);
    }
  });
});

server.listen(8080, () => {
  console.log(greenBright.bold('listening on *:8080'));
});