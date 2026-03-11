import React from 'react';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Divider from '@mui/material/Divider';
import { Typography } from '@mui/material'; // 引入Divider组件

function CmChooseRadio({
  items,
  labelProp,
  legend = 'Choose an option',
  keyProp,
  orientation = 'vertical',
  radioCallValue,
  mr = '16px',
}) {
  const [selectedValue, setSelectedValue] = React.useState('');
  const handleRadioChange = (event) => {
    setSelectedValue(event.target.value);
    if (radioCallValue) {
      radioCallValue(event.target.value);
    }
  };
  return (
    <FormControl component="fieldset" sx={{ marginBottom: '12px', marginLeft: '15px', marginTop: '28px' }}>
      <Typography
        sx={{
          fontFamily: "'Noto Sans JP', sans-serif",
          fontSize: '22px',
          fontWeight: 600,
          color: 'black',
          lineHeight: '30px',
          letterSpacing: '0.06em',
          textAlign: 'left',
        }}
      >
        {legend}
      </Typography>
      <RadioGroup
        aria-label="options"
        name="options"
        sx={{ marginTop: '8px' }}
        value={selectedValue}
        onChange={handleRadioChange}
        row={orientation === 'horizontal'} // 控制水平或垂直布局
      >
        {/* eslint-disable-next-line */}
        {items.map((item, index) => (
          <React.Fragment key={item[keyProp]}>
            {' '}
            {/* 使用item[keyProp]作为key */}
            <FormControlLabel
              value={item[keyProp]} // 使用keyProp指定的属性作为Radio的value
              control={
                <Radio
                  sx={{
                    color: '#BABABA', // Color when not checked
                    '&.Mui-checked': {
                      color: '#28AEB1', // Color when checked
                    },

                    marginRight: mr,
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontFamily: "'Noto Sans JP', sans-serif",
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: '27px',
                    letterSpacing: '0.06em',
                    textAlign: 'left',
                  }}
                >
                  {item[labelProp]}
                </Typography>
              } // 使用labelProp指定的属性作为标签文本
            />
            {orientation === 'vertical' && <Divider />}{' '}
            {/* 在垂直布局中，除了最后一个选项外，在每个选项后面添加分割线 */}
          </React.Fragment>
        ))}
      </RadioGroup>
    </FormControl>
  );
}
export default CmChooseRadio;
