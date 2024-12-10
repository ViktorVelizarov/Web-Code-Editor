import React, { useEffect, useRef, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material-ocean.css';

// Dynamically import modes
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike'; // This supports C, C++, Java

import 'codemirror/keymap/sublime';
import io from 'socket.io-client';
import { useStore } from '../store';
import LanguageSelector from './LanguageSelector';
import Output from './Output';
import { CODE_SNIPPETS } from '../constants';

const CodeEditor = () => {
  const [users, setUsers] = useState([]);
  const [language, setLanguage] = useState("javascript");
  const { username, roomId } = useStore(({ username, roomId }) => ({
    username,
    roomId,
  }));

  const editorRef = useRef(null);

  // Map languages to CodeMirror modes
  const getCodeMirrorMode = (language) => {
    switch(language) {
      case 'javascript':
        return 'javascript';
      case 'python':
        return 'python';
      case 'cpp':
        return 'text/x-c++src';
      case 'java':
        return 'text/x-java';
      case 'c':
        return 'text/x-csrc';
      default:
        return 'javascript';
    }
  };

  useEffect(() => {
    // Initialize CodeMirror
    const textArea = document.getElementById('code-editor');
    const editor = CodeMirror.fromTextArea(textArea, {
      lineNumbers: true,
      keyMap: 'sublime',
      theme: 'material-ocean',
      mode: getCodeMirrorMode(language),
      lineWrapping: true,
    });

    // Store reference to editor
    editorRef.current = editor;

    // Set initial value
    editor.doc.setValue(CODE_SNIPPETS[language] || '');

    // Initialize socket connection
    const socket = io('http://localhost:8080', {
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
    socket.on('CODE_CHANGED', (newCode) => {
      const currentCode = editor.getValue();
      if (newCode !== currentCode) {
        const cursorPosition = editor.getCursor(); // Save cursor position
        editor.doc.setValue(newCode); // Update the editor content
        editor.setCursor(cursorPosition); // Restore cursor position
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
  }, [roomId, username, language]);

  const onSelect = (selectedLanguage) => {
    setLanguage(selectedLanguage);
    if (editorRef.current) {
      // Update mode
      editorRef.current.setOption('mode', getCodeMirrorMode(selectedLanguage));
      
      // Set value from code snippets
      editorRef.current.doc.setValue(CODE_SNIPPETS[selectedLanguage] || '');
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={4}>
        <Box sx={{ width: "50%" }}>
          <Typography variant="h5" gutterBottom>
            Username: {username}
          </Typography>
          <Typography variant="h5" gutterBottom>
            Room ID: {roomId}
          </Typography>
          <Typography variant="h5" gutterBottom>
            Connected Users: <b>{users.length}</b>
          </Typography>
          
          <LanguageSelector 
            language={language} 
            onSelect={onSelect} 
          />
          
          <textarea id="code-editor" />
        </Box>
        <Output 
          editorRef={editorRef} 
          language={language} 
        />
      </Stack>
    </Box>
  );
};

export default CodeEditor;