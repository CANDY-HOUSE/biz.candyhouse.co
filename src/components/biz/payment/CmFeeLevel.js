import { Box, Button, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { ios } from '@/theme/appHomeStyle';

const levelData = (t) => [
  {
    id: 0,
    name: 'Free',
    feeC: 0,
    fee: t('admin.plan.perMonth'),
    isUpgrade: true,
    users: t('admin.plan.users', { value: '5' }),
    doors: t('admin.plan.doors', { value: '1' }),
    apis: t('admin.plan.apiLimit', { value: '1,000' }),
    cfpUse: t('admin.plan.authDevicePages'),
  },
  {
    id: 1,
    name: 'Light',
    feeC: '1,980',
    fee: t('admin.plan.perMonth'),
    isUpgrade: false,
    users: t('admin.plan.users', { value: '20' }),
    doors: t('admin.plan.doors', { value: '2' }),
    apis: t('admin.plan.apiLimit', { value: '20,000' }),
    cfpUse: t('admin.plan.authDevicePages'),
  },
  {
    id: 2,
    name: 'Pro',
    feeC: '4,980',
    fee: t('admin.plan.perMonth'),
    isUpgrade: false,
    users: t('admin.plan.users', { value: '50' }),
    doors: t('admin.plan.doors', { value: '5' }),
    apis: t('admin.plan.apiLimit', { value: '50,000' }),
    cfpUse: t('admin.plan.authDevicePages'),
  },
  {
    id: 3,
    name: 'Business',
    feeC: '9,800',
    fee: t('admin.plan.perMonth'),
    isUpgrade: false,
    users: t('admin.plan.users', { value: '100' }),
    doors: t('admin.plan.doors', { value: '10' }),
    apis: t('admin.plan.apiLimit', { value: '200,000' }),
    cfpUse: t('admin.plan.authDevicePages'),
  },
  {
    id: 4,
    name: 'Enterprise',
    feeC: '19,800',
    fee: t('admin.plan.perMonth'),
    isUpgrade: false,
    users: t('admin.plan.users', { value: '200' }),
    doors: t('admin.plan.doors', { value: '50' }),
    apis: t('admin.plan.apiLimit', { value: '1,000,000' }),
    cfpUse: t('admin.plan.authDevicePages'),
  },
];

// eslint-disable-next-line
const CmCheckText = ({ item, name }) => {
  if (!item[name]) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: '10px' }}>
      <CheckCircleIcon sx={{ fontSize: 18, color: item.isUpgrade ? ios.tint : ios.tertiaryLabel }} />
      <Typography sx={{ fontSize: 14, color: ios.label }}>{item[name]}</Typography>
    </Box>
  );
};

export const CmFeeLevel = ({ callUpdate, nextPrice, levleInfo }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(levelData(t));

  useEffect(() => {
    setData((prevState) =>
      prevState.map((item) => {
        let isCancel = false;
        if (nextPrice === 0) {
          isCancel = item.id === 0;
        } else {
          isCancel = nextPrice ? item.id === Math.floor(nextPrice / 2) : false;
        }
        return { ...item, isUpgrade: item.id === levleInfo.level, isCancel: isCancel };
      })
    );
  }, [levleInfo, nextPrice]);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
      {data.map((item, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            p: '20px',
            bgcolor: ios.card,
            borderRadius: '18px',
            boxShadow: item.isUpgrade ? `inset 0 0 0 2px ${ios.tint}` : 'none',
          }}
        >
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: ios.label }}>{item.name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '4px', mt: '8px' }}>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: ios.label }}>{item.feeC}</Typography>
            <Typography sx={{ fontSize: 14, color: ios.secondaryLabel }}>{item.fee}</Typography>
          </Box>
          <Button
            disableElevation
            variant="contained"
            size="large"
            sx={{
              my: '16px',
              height: 40,
              borderRadius: '10px',
              fontSize: 15,
              fontWeight: 600,
              color: 'white',
              '&:hover': { backgroundColor: ios.tint, opacity: 0.8 },
            }}
            disabled={item.isUpgrade}
            onClick={() => {
              console.log('clic', item);
              if (callUpdate) callUpdate(item.id, item.isCancel);
            }}
          >
            {!levleInfo
              ? t('admin.plan.upgrade')
              : item.isUpgrade
                ? t('admin.plan.current')
                : item.id > levleInfo.level
                  ? t('admin.plan.upgrade')
                  : item.isCancel
                    ? t('admin.plan.cancelDowngrade')
                    : t('admin.plan.downgrade')}
          </Button>
          <CmCheckText item={item} name={'users'} />
          <CmCheckText item={item} name={'doors'} />
          <CmCheckText item={item} name={'apis'} />
          <CmCheckText item={item} name={'cfpUse'} />
        </Box>
      ))}
    </Box>
  );
};
