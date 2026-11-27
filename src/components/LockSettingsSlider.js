import { Slider } from '@mui/material';
import { styled } from '@mui/material/styles';

// Shared iOS-style slider for BLE power, auto-unlock radius and radar distance.
export default styled(Slider)({
  height: 4,
  '& .MuiSlider-rail': { backgroundColor: '#E5E5EA', opacity: 1 },
  '& .MuiSlider-track': { border: 0 },
  '& .MuiSlider-thumb': {
    width: 28,
    height: 28,
    backgroundColor: '#fff',
    boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.04)',
    '&:hover, &.Mui-focusVisible, &.Mui-active': {
      boxShadow: '0 3px 8px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(0,0,0,0.04)',
    },
  },
  '& .MuiSlider-valueLabel': { backgroundColor: 'currentColor', color: 'inherit' },
  '& .MuiSlider-valueLabelLabel': { color: '#fff' },
});
