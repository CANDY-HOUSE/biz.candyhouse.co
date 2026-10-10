import { Slider } from '@mui/material';
import { styled } from '@mui/material/styles';

// Shared native-style slider for BLE power and auto-unlock radius.
export default styled(Slider)({
  '& .MuiSlider-rail': { backgroundColor: '#d3d3d3', opacity: 1 },
  '& .MuiSlider-track': { border: 0 },
  '& .MuiSlider-thumb': { width: 27, height: 27, boxShadow: 'none' },
  '& .MuiSlider-valueLabel': { backgroundColor: 'currentColor', color: 'inherit' },
  '& .MuiSlider-valueLabelLabel': { color: '#fff' },
});
