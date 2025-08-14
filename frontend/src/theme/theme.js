import { createTheme } from '@mui/material/styles';

export const getDesignTokens = (mode) => ({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    mode,
    primary: { main: '#1273ea' },
    secondary: { main: '#f5c518' },
    success: { main: '#2ecc71' },
    info: { main: '#1e88e5' },
    warning: { main: '#f5c518' },
    background: {
      default: mode==='dark' ? '#121212' : '#f5f7fb',
      paper: mode==='dark' ? '#1e1e1e' : '#ffffff'
    }
  },
  // Keep base shape radius smaller and define custom token for cards
  shape: { borderRadius: 4 },
  spacing: 8,
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h4: { 
      fontWeight: 700,
      fontSize: {
        xs: '1.8rem',
        sm: '2.125rem'
      }
    },
    h5: { 
      fontWeight: 700,
      fontSize: {
        xs: '1.25rem',
        sm: '1.5rem'
      }
    },
    h6: { 
      fontWeight: 600,
      fontSize: {
        xs: '1.1rem',
        sm: '1.25rem'
      }
    },
    subtitle1: { 
      fontWeight: 600,
      fontSize: {
        xs: '0.9rem',
        sm: '1rem'
      }
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: ({ theme }) => ({
          background: theme.palette.mode==='dark'
            ? 'radial-gradient(circle at 25% 20%, #1d1d1d 0%, #121212 55%)'
            : 'radial-gradient(circle at 25% 20%, #ffffff 0%, #f5f7fb 60%)',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          overflowY: 'scroll'
        }),
        '::-webkit-scrollbar': { width: 10 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
  '::-webkit-scrollbar-thumb': ({ theme }) => ({ background: '#2a2a2a', borderRadius: theme.shape.borderRadius, border: '2px solid #121212' }),
      }
    },
    MuiSnackbar: {
      // Ensure all Snackbars appear in the top-right by default
      defaultProps: {
        anchorOrigin: { vertical: 'top', horizontal: 'right' }
      }
    },
    MuiContainer: {
      defaultProps: { maxWidth: 'lg' }
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          // Unified card/container radius
          borderRadius: theme.shape.borderRadius,
          transition: 'background-color .25s ease, box-shadow .25s ease, border-color .25s ease',
          border: theme.palette.mode==='dark'? '1px solid #262626':'1px solid #e5e8ef',
          backgroundColor: theme.palette.mode==='dark' ? '#1b1b1b' : '#ffffff',
        })
      }
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
        })
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            borderRadius: theme.shape.borderRadius,
          }
        })
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
        })
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16, // Keep chips more rounded but not excessive
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: .2
        },
        containedPrimary: ({ theme }) => ({
          boxShadow: '0 4px 18px -6px rgba(0,0,0,0.4)',
          '&:hover': { boxShadow: '0 6px 30px -8px rgba(0,0,0,0.55)' }
        }),
        outlinedPrimary: ({ theme }) => ({
          borderWidth: 2,
          '&:hover': { borderWidth: 2 }
        })
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius
        })
      }
    }
  },
  custom: {
    // Use the same radius as shape.borderRadius for consistency
    radii: { card: 4 },
    tiles: {
      image: {
        bg: 'linear-gradient(135deg,#0582ff 0%,#3fa9ff 60%,#7fc8ff 100%)',
        fg: '#ffffff'
      },
      storytelling: {
        bg: 'linear-gradient(135deg,#f5c518 0%,#ffd54f 70%,#ffe082 100%)',
        fg: '#1a1a1a'
      },
      accentA: { bg:'linear-gradient(135deg,#673ab7 0%,#9575cd 60%,#b39ddb 100%)', fg:'#fff' },
      accentB: { bg:'linear-gradient(135deg,#2e7d32 0%,#43a047 60%,#66bb6a 100%)', fg:'#fff' }
    }
  }
});

export function buildTheme(mode){
  return createTheme(getDesignTokens(mode));
}
