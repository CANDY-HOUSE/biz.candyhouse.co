// Match Biz's quiet action rows; do not change switch track colors or page backgrounds.
export const lockSettingsInteraction = {
  WebkitTapHighlightColor: 'transparent',
  '& .MuiTouchRipple-root': { display: 'none' },
  '& button, & [role="button"]': { WebkitTapHighlightColor: 'transparent', outline: 'none' },
  '& .MuiButton-root:hover, & .MuiIconButton-root:hover, & .MuiSwitch-switchBase:hover': {
    backgroundColor: 'transparent',
  },
  '& .MuiListItemButton-root:hover, & .MuiListItemButton-root.Mui-focusVisible': { backgroundColor: 'transparent' },
};
