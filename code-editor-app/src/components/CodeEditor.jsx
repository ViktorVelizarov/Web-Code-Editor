import React, { useEffect, useState } from 'react';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material-ocean.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/keymap/sublime';
import CodeMirror from 'codemirror';
import io from 'socket.io-client';
import { Typography } from '@mui/material'; // Material UI Typography
import { useStore } from '../store';

const RealTimeEditor = () => {
  const [users, setUsers] = useState([]);
  const { username, roomId } = useStore(({ username, roomId }) => ({
    username,
    roomId,
  }));

  useEffect(() => {
    // Initialize CodeMirror
    const editor = CodeMirror.fromTextArea(document.getElementById('ds'), {
      lineNumbers: true,
      keyMap: 'sublime',
      theme: 'material-ocean',
      mode: 'javascript',
    });

    // Initialize socket connection
    const socket = io('https://collaborativecodeeditor-440923.lm.r.appspot.com/', {
      transports: ['websocket'],
    });

    // Handle socket connection events
    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('CONNECTED_TO_ROOM', { roomId, username });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      socket.emit('DISCONNECT_FROM_ROOM', { roomId, username });
    });

    // Listen for code changes from the server
    socket.on('CODE_CHANGED', (code) => {
      console.log('CODE_CHANGED event received with code:', code);
      if (code !== editor.getValue()) {
        editor.setValue(code); // Update only if different to avoid loop
      }
    });

    // Listen for updated user list
    socket.on('ROOM:CONNECTION', (users) => {
      console.log('Updated users in room:', users);
      setUsers(users);
    });

    // Listen for changes in the CodeMirror editor and emit them
    editor.on('change', (instance, changes) => {
      const { origin } = changes;
      if (origin !== 'setValue') { // Prevent emit on setValue to avoid loops
        console.log('Emitting CODE_CHANGED event with code:', instance.getValue());
        socket.emit('CODE_CHANGED', instance.getValue());
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection');
      socket.emit('DISCONNECT_FROM_ROOM', { roomId, username });
      socket.disconnect();
      editor.toTextArea(); // Cleanup CodeMirror instance
    };
  }, [roomId, username]);

  return (
    <>
      <Typography variant="h5">Your username is: {username}</Typography>
      <Typography variant="h5">The room ID is: {roomId}</Typography>
      <Typography variant="h5">
        How many people are connected: <b>{users.length}</b>
      </Typography>
      <textarea id="ds" />
    </>
  );
};

export default RealTimeEditor;
