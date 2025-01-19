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

  import Room from './models/Room.js';
  import UserRoom from './models/UserRoom.js';

  const { blueBright, greenBright, redBright } = chalk;

  function createApp() {
    const app = express();

    app.use(json());
    app.use(cors());

    app.use((req, res, next) => {
      if (req.originalUrl === '/favicon.ico') {
        res.status(204).end();
      } else {
        next();
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
        owner: username,
        created: moment().toISOString(),
        updated: moment().toISOString()
      });

      await room.save();
      res.status(201).send({ roomId });
    });

    return app;
  }

  function createServer() {
    const app = createApp();
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "http://localhost:8080",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    // Socket.IO logic here
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
        try {
          // Store socketId, roomId, and username in the UserRoom collection
          await UserRoom.create({ socketId: socket.id, roomId, username });
        
           // Update or create the Room document
        const room = await Room.findOneAndUpdate(
          { roomId: roomId },
          { 
            $addToSet: { users: username },
            $setOnInsert: { owner: username }, // Set owner only if document is being created
            updated: moment().toISOString() 
          },
          { upsert: true, new: true }
        );
        
          // Find users in the same room
          const usersInRoom = await UserRoom.find({ roomId }).select('username -_id');
          const userList = [...new Set(usersInRoom.map(user => user.username))]; // Ensure unique usernames
          
          // Join the socket to the room
          socket.join(roomId);
          
          console.log(`User ${username} connected to room: ${roomId}`);
          console.log('Users in room:', userList);
    
           // Send both users list and owner information
        io.in(roomId).emit('ROOM:CONNECTION', { 
          users: userList,
          owner: room.owner
        });
        } catch (error) {
          console.error('Error in CONNECTED_TO_ROOM:', error);
        }
      });

       // Handle user removal
    socket.on('REMOVE_USER', async ({ roomId, username }) => {
      try {
        // Verify that the requesting socket is the room owner
        const room = await Room.findOne({ roomId });
        const requester = await UserRoom.findOne({ socketId: socket.id });
        
        if (room && requester && room.owner === requester.username) {
          // Find the socket ID of the user to remove
          const userToRemove = await UserRoom.findOne({ roomId, username });
          
          if (userToRemove) {
            // Remove user from both collections
            await UserRoom.deleteOne({ roomId, username });
            await Room.updateOne(
              { roomId },
              { 
                $pull: { users: username },
                updated: moment().toISOString()
              }
            );

            // Notify the removed user
            io.to(userToRemove.socketId).emit('ROOM:REMOVED');
            
            // Update the room's user list
            const remainingUsers = await UserRoom.find({ roomId }).select('username -_id');
            const userList = [...new Set(remainingUsers.map(user => user.username))];
            
            // Broadcast updated user list
            io.in(roomId).emit('ROOM:CONNECTION', {
              users: userList,
              owner: room.owner
            });
          }
        }
      } catch (error) {
        console.error('Error in REMOVE_USER:', error);
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
              io.in(roomId).emit('ROOM:CONNECTION', {
                users: userList,
                owner: Room.owner
              });
            }
          } else {
            console.log(`No session found for socket: ${socket.id}`);
          }
        } catch (error) {
          console.error('Error in disconnect handler:', error);
        }
      });
    });
    return { app, server, io };
  }

// Remove the conditional block and instead create a function to start the server
export async function startServer() {
  try {
    await mongoose.connect('mongodb+srv://viktorvelizarov1:RAJ96BJOusHZuAoM@cluster0.zr3t3.mongodb.net/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(blueBright.bold('Connected to MongoDB!'));
    const { server } = createServer();
    const PORT = process.env.PORT || 8080;
    
    server.listen(PORT, () => {
      console.log(greenBright.bold(`Listening on *:${PORT}`));
    });

    return server;
  } catch (err) {
    console.error(redBright.bold('Error connecting to MongoDB'), err);
    throw err;
  }
}

// Remove the previous conditional block with require.main === module

// If the file is run directly, call startServer
if (import.meta.url === `file://${new URL(import.meta.url).pathname}`) {
  startServer();
}

export { createApp, createServer};