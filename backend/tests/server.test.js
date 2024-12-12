import mongoose from 'mongoose';
import { createApp, createServer, startServer } from '../server.js';
import request from 'supertest';
import { Server } from 'socket.io';
import { io as clientIO } from 'socket.io-client';
import Room from '../models/Room.js';
import UserRoom from '../models/UserRoom.js';

describe('Server Application', () => {
  let app, server, io;
  const testMongoUri = 'mongodb+srv://viktorvelizarov1:RAJ96BJOusHZuAoM@cluster0.zr3t3.mongodb.net/';

  beforeAll(async () => {
    // Connect to a test database
    await mongoose.connect(testMongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create server for testing
    const serverSetup = createServer();
    app = serverSetup.app;
    server = serverSetup.server;
    io = serverSetup.io;
  });

  afterAll(async () => {
    // Cleanup: close server and database connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    server.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Room.deleteMany({});
    await UserRoom.deleteMany({});
  });

  // HTTP Endpoint Tests
  describe('HTTP Endpoints', () => {
    test('GET / should return hello world', async () => {
      const response = await request(app).get('/');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ msg: 'hello world' });
    });

    test('POST /create-room-with-user creates a new room', async () => {
      const response = await request(app)
        .post('/create-room-with-user')
        .send({ username: 'testUser' });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('roomId');

      // Verify room was created in database
      const room = await Room.findOne({ roomId: response.body.roomId });
      expect(room).toBeTruthy();
      expect(room.users).toContain('testUser');
    });
  });

  // Socket.IO Integration Tests
  describe('Socket.IO Functionality', () => {
    let clientSocket1, clientSocket2;
    let roomId;

    beforeEach(async () => {
      // Create a room before each socket test
      const response = await request(app)
        .post('/create-room-with-user')
        .send({ username: 'testUser1' });
      roomId = response.body.roomId;
    });

    afterEach(() => {
      if (clientSocket1) clientSocket1.disconnect();
      if (clientSocket2) clientSocket2.disconnect();
    });

    test('User can connect to a room', (done) => {
      clientSocket1 = clientIO('http://localhost:8080', {
        transports: ['websocket']
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('CONNECTED_TO_ROOM', { 
          roomId: roomId, 
          username: 'testUser1' 
        });

        clientSocket1.on('ROOM:CONNECTION', (userList) => {
          expect(userList).toContain('testUser1');
          done();
        });
      });
    });

    test('Disconnecting removes user from room', (done) => {
      clientSocket1 = clientIO('http://localhost:8080', {
        transports: ['websocket']
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('CONNECTED_TO_ROOM', { 
          roomId: roomId, 
          username: 'testUser1' 
        });

        clientSocket1.on('ROOM:CONNECTION', (userList) => {
          expect(userList).toContain('testUser1');
          
          // Disconnect and verify
          clientSocket1.disconnect();

          // Wait a bit to allow disconnect processing
          setTimeout(async () => {
            const remainingUsers = await UserRoom.find({ roomId });
            expect(remainingUsers.length).toBe(0);
            done();
          }, 100);
        });
      });
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    let clientSocket1; // Declare clientSocket1 in a wider scope
  
    afterEach(() => {
      if (clientSocket1) clientSocket1.disconnect(); // Ensure disconnection after each test
    });
  
    test('Handles connection to non-existent room gracefully', (done) => {
      clientSocket1 = clientIO('http://localhost:8080', {
        transports: ['websocket']
      });
  
      clientSocket1.on('connect', () => {
        // Attempt to connect to a non-existent room
        clientSocket1.emit('CONNECTED_TO_ROOM', { 
          roomId: 'non-existent-room', 
          username: 'testUser' 
        });
  
        // Add a timeout to ensure the test completes
        setTimeout(() => {
          done();
        }, 100);
      });
  
      // Add error handling to prevent potential unhandled errors
      clientSocket1.on('connect_error', (error) => {
        console.error('Connection error:', error);
        done();
      });
    });
  });
});