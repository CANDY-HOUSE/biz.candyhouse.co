import { createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      light: '#68c6c8',
      main: '#28aeb1',
      dark: '#1d7f7f',
    },
    secondary: {
      light: '#F1F1F1',
      main: '#F1F1F1',
      other: '#cccccc',
    },
    success: {
      main: '#68C6C8',
    },
    title: {
      main: '#333333',
      light: '#666666',
      other: '#999999',
    },
    info: {
      light: '#cccccc',
      main: '#666666',
    },
    warn: {
      main: '#f3dd71',
    },
    error: {
      light: '#db807c',
      main: '#CC4A44',
    },
  },
  typography: {
    // letterSpacing: '10px',
    fontFamily: "'Noto Sans JP', sans-serif",
    h2: {
      fontSize: '22px',
      fontWeight: 'bold',
    },
    h3: {
      fontSize: '18px',
      fontWeight: 'bolder',
    },
    h4: {
      fontSize: '16px',
    },
    h5: {
      fontSize: '14px',
    },
    h6: {
      fontSize: '12px',
    },
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '.ptr--ptr': {
          boxShadow: 'none !important',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          letterSpacing: '0.02rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiFilledInput-root': {
            backgroundColor: '#FAFAFA',
            '&:after': {
              borderBottomColor: '#28aeb1',
            },
            '&:hover:not(.Mui-disabled):before': {
              borderBottomColor: '#28aeb1',
            },
            '&:before': {
              borderBottomColor: '#FAFAFA',
            },
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          margin: '0px',
          padding: '0px',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          margin: '0px',
          padding: '5px',
          '&:last-child': {
            paddingBottom: 0,
          },
          overflow: 'unset',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '0%',
          margin: '0px',
          padding: '16px',
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        asterisk: {
          color: '#d32f2f',
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          '&[data-testid="KeyboardArrowLeftIcon"]': {
            color: 'rgba(0, 0, 0, 0.87)',
          },
          '&.keyboard-arrow-left': {
            color: 'rgba(0, 0, 0, 0.87)',
          },
        },
      },
    },
  },
});

export default theme;
