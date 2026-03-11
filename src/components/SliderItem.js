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
          width: 100,
          mr: 1,
          '@media (pointer: coarse)': {
            padding: '0 !important',
          },
          '& .MuiSlider-thumb': {
            width: 10,
            height: 10,
            transition: 'none !important',
          },
          '& .MuiSlider-track': {
            height: 2,
            transition: 'none !important',
          },
          '& .MuiSlider-rail': {
            height: 2,
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
