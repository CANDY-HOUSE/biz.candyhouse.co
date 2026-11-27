import React, { useState } from 'react';
import { ListItem, ListItemText, Slider } from '@mui/material';

export default function SliderItem({ text, value = 0, onChangeCommitted }) {
  const [sliderValue, setSliderValue] = useState(value);

  React.useEffect(() => {
    setSliderValue(value);
  }, [value]);

  return (
    <ListItem>
      <ListItemText primary={text} />
      <Slider
        sx={{
          width: 140,
          mr: '12px',
          height: 4,
          '@media (pointer: coarse)': {
            padding: '12px 0 !important',
          },
          '& .MuiSlider-thumb': {
            width: 24,
            height: 24,
            bgcolor: '#fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.04)',
            transition: 'none !important',
          },
          '& .MuiSlider-track': {
            border: 0,
            transition: 'none !important',
          },
          '& .MuiSlider-rail': {
            bgcolor: '#E5E5EA',
            opacity: 1,
          },
        }}
        value={sliderValue}
        aria-label="Default"
        valueLabelDisplay="auto"
        valueLabelFormat={(value, _idx) => <>{`${value}%`}</>}
        onChange={(e, newValue) => setSliderValue(newValue)}
        onChangeCommitted={(e, newValue) => {
          onChangeCommitted?.(newValue);
        }}
      />
    </ListItem>
  );
}
