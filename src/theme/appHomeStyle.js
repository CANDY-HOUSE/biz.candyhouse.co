// iOS system colors for the APP home tabs (grouped background, labels, fills, separators).
export const ios = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  label: '#000000',
  secondaryLabel: 'rgba(60,60,67,0.6)',
  tertiaryLabel: 'rgba(60,60,67,0.3)',
  separator: 'rgba(60,60,67,0.18)',
  fill: 'rgba(118,118,128,0.12)',
  pressed: 'rgba(0,0,0,0.04)',
  tint: '#28AEB1',
  tintFill: 'rgba(40,174,177,0.14)',
  red: '#CC4A44',
  redFill: 'rgba(204,74,68,0.12)',
  cardRadius: '22px',
  spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
};

export const appSearchSx = {
  bgcolor: ios.fill,
  borderRadius: '12px',
  height: '38px',
  '& .MuiSvgIcon-root': { color: '#8E8E93', fontSize: 22, mt: 0, ml: '10px', mr: '6px' },
  '& .MuiInputBase-root': { fontSize: 17 },
  '& input::placeholder': { color: '#8E8E93', opacity: 1 },
};

export const appSectionLabelSx = {
  pl: '32px',
  pr: '16px',
  pt: '10px',
  pb: '8px',
  fontSize: 13,
  color: ios.secondaryLabel,
};
