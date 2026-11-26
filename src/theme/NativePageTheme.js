import { alpha, createTheme, ThemeProvider } from '@mui/material';
import { useLocation } from 'react-router-dom';
import theme from './theme';
import { routeOf } from '@/routes/manifest';

export function isNativePage(path) {
  return !!routeOf(path)?.nativeTheme;
}

export const nativePageTheme = createTheme(theme, {
  palette: { action: { hover: 'transparent', hoverOpacity: 0 } },
  components: {
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          WebkitTapHighlightColor: 'transparent',
          '&.Mui-focusVisible': { outline: '2px solid currentColor', outlineOffset: 2 },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState, theme }) => ({
          '&:hover': {
            '--variant-containedBg': theme.palette[ownerState.color]?.main || theme.palette.grey[300],
            '--variant-textBg': 'transparent',
            '--variant-outlinedBg': 'transparent',
            '--variant-outlinedBorder': theme.palette[ownerState.color]?.main
              ? alpha(theme.palette[ownerState.color].main, 0.5)
              : 'currentColor',
          },
        }),
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        // Several migrated actions use clickable ListItem (li), not ButtonBase.
        'button, [role="button"], a, .MuiListItem-root': { WebkitTapHighlightColor: 'transparent' },
      },
    },
  },
});

export default function NativePageTheme({ children }) {
  const { pathname } = useLocation();
  return <ThemeProvider theme={isNativePage(pathname) ? nativePageTheme : theme}>{children}</ThemeProvider>;
}
