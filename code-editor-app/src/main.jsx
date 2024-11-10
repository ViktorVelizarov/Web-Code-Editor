import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles';
import muiTheme from './muiTheme';
import { QueryClient, QueryClientProvider } from 'react-query'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
     <ThemeProvider theme={muiTheme}>
     <QueryClientProvider client={queryClient}>
      <App />
     </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
