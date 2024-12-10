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
      origin: "http://localhost:8080",
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

  // Handle connection to room
  socket.on('CONNECTED_TO_ROOM', async ({ roomId, username }) => {
    try {
      // Store socketId, roomId, and username in the UserRoom collection
      await UserRoom.create({ socketId: socket.id, roomId, username });
    
      // Update the Room document to add the user to the users array
      await Room.findOneAndUpdate(
        { roomId: roomId },
        { 
          $addToSet: { users: username },  // $addToSet prevents duplicate usernames
          updated: moment().toISOString() 
        }
      );
    
      // Find users in the same room
      const usersInRoom = await UserRoom.find({ roomId }).select('username -_id');
      const userList = [...new Set(usersInRoom.map(user => user.username))]; // Ensure unique usernames
      
      // Join the socket to the room
      socket.join(roomId);
      
      console.log(`User ${username} connected to room: ${roomId}`);
      console.log('Users in room:', userList);

      // Broadcast to ALL clients in the room, including the sender
      io.in(roomId).emit('ROOM:CONNECTION', userList);
    } catch (error) {
      console.error('Error in CONNECTED_TO_ROOM:', error);
    }
  });

  // Modify disconnect handler to be more robust
  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);

    try {
      // Find and remove the user from the UserRoom collection
      const userSession = await UserRoom.findOneAndDelete({ socketId: socket.id });
      if (userSession) {
        const { roomId, username } = userSession;
        
        // Find remaining users in the room
        const remainingUsers = await UserRoom.find({ roomId }).select('username -_id');
        const userList = [...new Set(remainingUsers.map(user => user.username))];

        if (userList.length === 0) {
          // Optionally delete the room if no users are left
          await Room.deleteOne({ roomId });
          console.log(`Room ${roomId} deleted as no users are left`);
        } else {
          console.log(`User ${username} disconnected from room: ${roomId}`);
          console.log('Remaining users:', userList);
          
          // Broadcast updated user list to all remaining clients in the room
          io.in(roomId).emit('ROOM:CONNECTION', userList);
        }
      } else {
        console.log(`No session found for socket: ${socket.id}`);
      }
    } catch (error) {
      console.error('Error in disconnect handler:', error);
    }
  });
});

server.listen(8080, () => {
  console.log(greenBright.bold('listening on *:8080'));
});