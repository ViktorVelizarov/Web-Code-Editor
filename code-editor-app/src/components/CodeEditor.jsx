import React, { useEffect, useRef, useState } from 'react';
import { Box, Stack, Typography, List, ListItem, ListItemText, IconButton } from '@mui/material';
import { UserX } from 'lucide-react';
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
  const [isOwner, setIsOwner] = useState(false);
  const [language, setLanguage] = useState("javascript");
  const { username, roomId } = useStore(({ username, roomId }) => ({
    username,
    roomId,
  }));

  const editorRef = useRef(null);
  const socketRef = useRef(null);

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

    editorRef.current = editor;
    editor.doc.setValue(CODE_SNIPPETS[language] || '');  

    // Initialize socket connection
    const socket = io('http://localhost:8080', {
      transports: ['websocket'],
    });
    socketRef.current = socket;

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
        const cursorPosition = editor.getCursor();
        editor.doc.setValue(newCode);
        editor.setCursor(cursorPosition);
      }
    });

    // Listen for updated user list and owner status
    socket.on('ROOM:CONNECTION', ({ users, owner }) => {
      console.log('Updated users in room:', users);
      setUsers(users);
      setIsOwner(owner === username);
    });

    // Listen for being removed from the room
    socket.on('ROOM:REMOVED', () => {
      alert('You have been removed from the room by the owner');
      // Redirect to home or room selection page
      window.location.href = '/';
    });

    editor.on('change', (instance, changes) => {
      const { origin } = changes;
      if (origin !== 'setValue') {
        console.log('Emitting CODE_CHANGED event with code:', instance.getValue());
        socket.emit('CODE_CHANGED', instance.getValue());
      }
    });

    return () => {
      console.log('Cleaning up socket connection');
      socket.emit('DISCONNECT_FROM_ROOM', { roomId, username });
      socket.disconnect();
      editor.toTextArea();
    };
  }, [roomId, username, language]);

  const handleRemoveUser = (userToRemove) => {
    if (isOwner && socketRef.current) {
      socketRef.current.emit('REMOVE_USER', { roomId, username: userToRemove });
    }
  };

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
            Username: {username} {isOwner && "(Room Owner)"}
          </Typography>
          <Typography variant="h5" gutterBottom>
            Room ID: {roomId}
          </Typography>
          
          <Box sx={{ mt: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Connected Users:</Typography>
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user}
                  className="flex items-center justify-between p-2 bg-gray-100 rounded"
                >
                  <span className="text-gray-900">{user}</span>
                  {isOwner && user !== username && (
                    <button
                      onClick={() => handleRemoveUser(user)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                      aria-label={`Remove ${user}`}
                    >
                      <UserX className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Box>
          
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