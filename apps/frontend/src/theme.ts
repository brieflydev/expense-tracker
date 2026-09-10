import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f6a5c',
      dark: '#0a4d43',
      light: '#3d8f82',
      contrastText: '#f4fbf9',
    },
    secondary: {
      main: '#1f4e79',
      dark: '#163a5c',
      light: '#4a7399',
    },
    background: {
      default: '#e7eef2',
      paper: 'rgba(255, 255, 255, 0.88)',
    },
    text: {
      primary: '#132029',
      secondary: '#516574',
    },
    divider: 'rgba(19, 32, 41, 0.12)',
  },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"DM Sans", "Segoe UI", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontFamily: '"DM Sans", "Segoe UI", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontFamily: '"DM Sans", "Segoe UI", sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"DM Sans", "Segoe UI", sans-serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"DM Sans", "Segoe UI", sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: 'Literata, Georgia, serif',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(21, 36, 31, 0.1)',
          backgroundColor: 'rgba(237, 243, 241, 0.85)',
          backdropFilter: 'blur(12px)',
          color: '#15241f',
        },
      },
    },
  },
});
