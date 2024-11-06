import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#42a5f5', // Customize primary color
    },
    secondary: {
      main: '#ff4081', // Customize secondary color
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif', // Default font
  },
});

export default theme;