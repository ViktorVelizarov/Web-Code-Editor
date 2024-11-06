import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles';
import muiTheme from './muiTheme';
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
     <ThemeProvider theme={muiTheme}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
