import { Box, Button, FormControlLabel, Typography } from '@mui/material';
import Radio from '@mui/material/Radio';
import React, { useEffect, useState } from 'react';
import RadioGroup from '@mui/material/RadioGroup';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { LoadingButton } from '@mui/lab';
import { URLs } from '@constants/URLs';

export const CmLevelUpdate = ({ clickCancel, clickSure, chooseLevel, curLevel, levelConfig }) => {
  const [isYear, setIsYear] = useState(false);
  const [title, setTitle] = useState('');
  const [submitting, setIsSubmitting] = useState(false);

  const tyStyle = {
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: '22px',
    fontWeight: 600,
    lineHeight: '35px',
    letterSpacing: '0.06em',
    textAlign: 'left',
  };
  const tyStyle2 = {
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: '16px',
    fontWeight: 500,
    lineHeight: '22px',
    letterSpacing: '0.06em',
    textAlign: 'left',
    marginTop: '30px',
    marginLeft: '20px',
  };
  const tyStyle3 = {
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: '27px',
    letterSpacing: '0.06em',
    textAlign: 'left',
  };
  const tyStyle4 = {
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: '15px',
    fontWeight: 600,
    lineHeight: '27px',
    letterSpacing: '0.06em',
    textAlign: 'center',
    color: '#ffffff',
    backgroundColor: '#db807c',
    borderRadius: '30px',
  };
  const tyStyle5 = {
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: '16px',
    fontWeight: 500,
    lineHeight: '22px',
    letterSpacing: '0.06em',
    textAlign: 'left',
    marginLeft: '20px',
  };

  const tyStyle6 = {
    color: '#86868B',
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '22px',
    letterSpacing: '0.06em',
    textAlign: 'left',
    marginLeft: '20px',
    marginTop: '30px',
  };

  /*const textMonth='月支付         59,760円 '
    const textYear ='年支付         59,760円 / 年（4,980円 / 月）'
    */

  const bills = [
    {
      name: 'Free',
      price_m: levelConfig.free_month,

      price_y_total: levelConfig.free_year,
    },
    {
      name: 'Light',
      price_m: levelConfig.light_month,

      price_y_total: levelConfig.light_year,
    },
    {
      name: 'Pro',
      price_m: levelConfig.pro_month,

      price_y_total: levelConfig.pro_year,
    },
    {
      name: 'Business',
      price_m: levelConfig.business_month,

      price_y_total: levelConfig.business_year,
    },
    {
      name: 'Enterprise',
      price_m: levelConfig.enterprise_month,

      price_y_total: levelConfig.enterprise_year,
    },
  ];
  const [textMonth, setTextMonth] = useState('');
  const [textYear, setTextYear] = useState('');
  const [titleTag, setTitleTag] = useState('');
  const [taxTag, setTaxTag] = useState('');
  const [supportTag, setSupportTag] = useState('');

  function formatNumber(number) {
    if (!number) {
      return number;
    }

    console.log('formatNumber', number);
    return number.toLocaleString('ja-JP');
  }

  useEffect(() => {
    console.log('打印当前值', chooseLevel, curLevel);

    setTitle(
      chooseLevel > curLevel
        ? `${bills[chooseLevel].name}へアップグレード`
        : `${bills[chooseLevel].name}へダウングレード`
    );
    setTitleTag(
      chooseLevel > curLevel
        ? '※ご利用中のプランは終了し、新しいプランがすぐに有効になります。'
        : '※ご利用中のプランはお支払い済み期間まで継続し、次の期間より新しいプランが有効になります。'
    );
    setTaxTag('※表示価格はすべて税抜き価格です。');
    setSupportTag(
      <span>
        プランの詳細は
        <a
          href={URLs.plans}
          target="_blank"
          style={{
            color: '#86868B',
            display: 'inline',
            textDecoration: 'underline',
          }}
        >
          こちら
        </a>
      </span>
    );

    // 月支付
    setTextMonth(`月額プラン         ${formatNumber(bills[chooseLevel].price_m)}円 `);
    // 年支付
    setTextYear(
      `年額プラン         ${formatNumber(bills[chooseLevel].price_y_total)}円（月換算${formatNumber(bills[chooseLevel].price_y_total / 12)}円） `
    );
  }, [chooseLevel]);

  const handleRadioChange = (event) => {
    setIsYear(event.target.value === 'year');
  };
  return (
    <>
      <Box
        sx={{
          // width: '795px',
          display: 'flex',
          flexDirection: 'column',
          // height: '362px',
          borderRadius: '10px',
        }}
      >
        <Typography sx={tyStyle}>{title}</Typography>

        <RadioGroup
          name="subscription-period"
          defaultValue="month"
          sx={{ marginTop: '30px', marginLeft: '20px', whiteSpace: 'pre' }}
          onChange={handleRadioChange}
        >
          <FormControlLabel
            sx={{
              ...tyStyle3,
              wordBreak: { xs: 'break-word', sm: 'normal' },
              whiteSpace: { xs: 'normal', sm: 'pre' },
            }}
            value="month"
            control={<Radio />}
            label={<Typography sx={tyStyle3}>{textMonth}</Typography>}
          />
          <FormControlLabel
            sx={tyStyle3}
            value="year"
            control={<Radio />}
            label={
              <Stack direction="row" alignItems="center" spacing={0}>
                <Typography
                  sx={{
                    ...tyStyle3,
                    wordBreak: { xs: 'break-word', sm: 'normal' },
                    whiteSpace: { xs: 'normal', sm: 'pre' },
                  }}
                >
                  {textYear}
                </Typography>
                <Chip
                  sx={tyStyle4}
                  label={`年間${formatNumber(bills[chooseLevel].price_m * 12 - bills[chooseLevel].price_y_total)}円お得!`}
                />
              </Stack>
            }
          />
        </RadioGroup>
        <Typography sx={tyStyle2}>{titleTag}</Typography>
        <Typography sx={tyStyle5}>{taxTag}</Typography>
        <Typography sx={tyStyle6}>{supportTag}</Typography>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            mt: '40px',
          }}
        >
          <Button
            disabled={submitting}
            size="small"
            sx={{
              mr: '10px',
              color: '#28aeb1',
              fontFamily: "'Noto Sans JP', sans-serif",
            }}
            onClick={clickCancel}
          >
            キャンセル
          </Button>
          <LoadingButton
            loading={submitting}
            disableElevation
            size="small"
            variant="contained"
            sx={{
              fontFamily: "'Noto Sans JP', sans-serif",
              color: 'white',
              backgroundColor: '#28aeb1',
            }}
            onClick={() => {
              setIsSubmitting(true);
              clickSure(chooseLevel, isYear, () => {
                setIsSubmitting(false);
              });
            }}
          >
            確定
          </LoadingButton>
        </Box>
      </Box>
    </>
  );
};
