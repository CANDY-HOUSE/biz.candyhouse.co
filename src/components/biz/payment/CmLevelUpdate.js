import { Box, Button, FormControlLabel, Typography } from '@mui/material';
import Radio from '@mui/material/Radio';
import React, { useEffect, useState } from 'react';
import RadioGroup from '@mui/material/RadioGroup';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { LoadingButton } from '@mui/lab';
import { URLs } from '@constants/URLs';
import { useTranslation } from 'react-i18next';

export const CmLevelUpdate = ({ clickCancel, clickSure, chooseLevel, curLevel, levelConfig }) => {
  const { t } = useTranslation();
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
        ? t('admin.plan.upgradeTo', { name: bills[chooseLevel].name })
        : t('admin.plan.downgradeTo', { name: bills[chooseLevel].name })
    );
    setTitleTag(chooseLevel > curLevel ? t('admin.plan.upgradeNote') : t('admin.plan.downgradeNote'));
    setTaxTag(t('admin.plan.taxNote'));
    setSupportTag(
      <span>
        {t('admin.plan.detailsPrefix')}
        <a
          href={URLs.plans}
          target="_blank"
          style={{
            color: '#86868B',
            display: 'inline',
            textDecoration: 'underline',
          }}
        >
          {t('admin.plan.detailsLink')}
        </a>
      </span>
    );

    // 月支付
    setTextMonth(
      `${t('admin.plan.monthly')}         ${t('admin.plan.price', { price: formatNumber(bills[chooseLevel].price_m) })} `
    );
    // 年支付
    setTextYear(
      `${t('admin.plan.yearly')}         ${t('admin.plan.yearlyPrice', { price: formatNumber(bills[chooseLevel].price_y_total), monthly: formatNumber(bills[chooseLevel].price_y_total / 12) })} `
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
                  label={t('admin.plan.yearlySaving', {
                    amount: formatNumber(bills[chooseLevel].price_m * 12 - bills[chooseLevel].price_y_total),
                  })}
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
            {t('setting.cancel')}
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
            {t('admin.plan.confirm')}
          </LoadingButton>
        </Box>
      </Box>
    </>
  );
};
