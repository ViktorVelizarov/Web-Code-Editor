import React, { useRef } from 'react'
import { TextField, Button, Box, InputAdornment } from '@mui/material'
import { useMutation } from 'react-query'
import { useStore } from './store'
import axios from 'axios'

const EnterName = () => {
  const inputRef = useRef()
  const roomIdRef = useRef()
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

  const createRoom = async () => {
    const value = inputRef.current?.value

    await mutateAsync(
      { username: value, uri: 'create-room-with-user' },
      {
        onSuccess: ({ data }) => {
          setRoomId(data.roomId)
        },
      }
    )
    setUsername(value)
  }

  const enterRoom = async () => {
    const value = inputRef.current?.value
    const roomIdValue = roomIdRef.current?.value
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
    </Box>
  )
}

export default EnterName
