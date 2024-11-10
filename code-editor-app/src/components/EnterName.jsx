import React, { useRef } from 'react'
import { TextField, Button, Box, InputAdornment, Snackbar } from '@mui/material'
import { useMutation } from 'react-query'
import { useStore } from './store'
import axios from 'axios'

const EnterName = () => {
  const inputRef = useRef()
  const roomIdRef = useRef()
  const [toast, setToast] = React.useState({ open: false, message: '', severity: '' })
  const { setUsername, setRoomId } = useStore(({ setUsername, setRoomId }) => ({
    setUsername,
    setRoomId,
  }))

  const { mutateAsync } = useMutation(({ username, roomId, uri }) => {
    return axios.post(`https://collaborativecodeeditor-440923.lm.r.appspot.com/${uri}`, {
      username,
      roomId,
    })
  })

  const showToast = (message, severity) => {
    setToast({ open: true, message, severity })
  }

  const createRoom = async () => {
    const value = inputRef.current?.value

    if (!value) {
      showToast('Please enter your username', 'error')
      return
    }

    await mutateAsync(
      { username: value, uri: 'create-room-with-user' },
      {
        onSuccess: ({ data }) => {
          setRoomId(data.roomId)
          showToast('We created your username, you will find yourself in a room. Share the room id with anyone.', 'success')
        },
      }
    )
    setUsername(value)
  }

  const enterRoom = async () => {
    const value = inputRef.current?.value
    const roomIdValue = roomIdRef.current?.value

    if (!value || !roomIdValue) {
      showToast('Please enter text in both inputs', 'error')
      return
    }

    setRoomId(roomIdValue)
    setUsername(value)
  }

  return (
    <Box>
      <TextField
        variant="outlined"
        placeholder="Enter your name"
        inputRef={inputRef}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Button variant="contained" onClick={createRoom}>
                Go!
              </Button>
            </InputAdornment>
          ),
        }}
        fullWidth
        margin="normal"
      />
      <TextField
        variant="outlined"
        placeholder="Enter a room id"
        inputRef={roomIdRef}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Button variant="contained" onClick={enterRoom}>
                Join!
              </Button>
            </InputAdornment>
          ),
        }}
        fullWidth
        margin="normal"
      />
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        message={toast.message}
      />
    </Box>
  )
}

export default EnterName
