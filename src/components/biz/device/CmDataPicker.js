import DatePicker from 'react-datepicker';
import { Box, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';

export const CmDataPicker = ({ callTime, sTitle = '利用開始日時', eTitle = '利用終了日時', sx = {} }) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 1800000)); // 1800秒后的时间

  useEffect(() => {
    console.log('CmDataPicker', new Date());

    if (callTime) callTime(startDate, endDate);
  }, [startDate, endDate]);
  const filterPassedTime = (time) => {
    return new Date().getTime() < time.getTime();
  };

  const filterStartedTime = (time) => {
    return startDate.getTime() < time.getTime();
  };
  return (
    <>
      <Box sx={sx}>
        <Typography
          sx={{
            marginRight: '10px',
            whiteSpace: 'no-wrap !important',
          }}
        >
          {sTitle}
        </Typography>
        <Box>
          <DatePicker
            selectsStart
            showTimeSelect
            locale="ja"
            dateFormat="Pp"
            timeCaption="時間"
            popperPlacement="top-start"
            selected={startDate}
            minDate={new Date()}
            filterTime={filterPassedTime}
            onChange={(date) => {
              if (date < new Date()) {
                date = new Date();
              }
              setStartDate(date);
              setEndDate(new Date(date.getTime() + 1800000)); // 更新 endDate
            }}
            customInput={
              <TextField
                variant="outlined"
                color="primary"
                size={'small'}
                sx={{
                  marginRight: '10px',
                  maxWidth: '180px',
                  input: { textAlign: 'center' },
                }}
              />
            }
          />
        </Box>
        <Typography sx={{ margin: '0 5px 0 -60px' }}>~</Typography>
        <Typography
          sx={{
            marginRight: '10px',
            whiteSpace: 'no-wrap !important',
          }}
        >
          {eTitle}
        </Typography>
        <DatePicker
          selectsStart
          showTimeSelect
          locale="ja"
          dateFormat="Pp"
          timeCaption="時間"
          popperPlacement="top-start"
          selected={endDate}
          minDate={new Date(startDate)}
          filterTime={filterStartedTime}
          onChange={(date) => {
            if (date < startDate) {
              date = new Date(startDate.getTime() + 1800000);
            }
            setEndDate(date);
          }}
          customInput={
            <TextField
              size={'small'}
              variant="outlined"
              color="primary"
              sx={{
                maxWidth: '180px',
                input: { textAlign: 'center' },
              }}
            />
          }
        />
      </Box>
    </>
  );
};
