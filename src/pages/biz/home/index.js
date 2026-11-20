import React, { useContext, useEffect, useState } from 'react';
import { Typography, Stack, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { ios, homeCards, hoverSx } from '@/theme/appHomeStyle';

const BizHomePage = () => {
  const { t } = useTranslation();
  const { gManageEmployee, gStripe, gManageDevice, gMediaType } = useContext(GlobalStateContext);

  const [memberCount, setMemberCount] = useState('');
  const [lockCount, setLockCount] = useState('');

  const noLimit = '/無制限';
  const statSx = homeCards
    ? {
        minWidth: 0,
        bgcolor: ios.card,
        borderRadius: ios.cardRadius,
        textAlign: 'left',
        color: ios.label,
        cursor: 'pointer',
        p: '18px 20px 14px',
        transition: 'background-color 0.2s ease',
        '& > p:first-of-type': { fontSize: 15, color: ios.secondaryLabel },
        '&:active': { bgcolor: '#E5E5EA' },
        ...hoverSx({ bgcolor: '#F9F9FB' }),
      }
    : {
        width: gMediaType.isMobile ? '100%' : '220px',
        borderRadius: '6px',
        backgroundColor: 'secondary.light',
        textAlign: 'left',
        color: 'inherit',
        cursor: 'pointer',
        p: '10px',
        '&:hover': {
          opacity: '0.6',
        },
      };
  const numberStyle = homeCards
    ? { fontSize: '48px', fontWeight: 600, lineHeight: 1.3 }
    : { fontSize: '60px', fontWeight: 'bold' };
  const unitStyle = homeCards
    ? { fontSize: '17px', fontWeight: 'normal', color: ios.secondaryLabel, marginLeft: '2px' }
    : { fontSize: '20px', fontWeight: 'normal' };

  useEffect(() => {
    if (gStripe.customerInfo.isRootUser) {
      setMemberCount(noLimit);
      setLockCount(noLimit);
    } else if (gStripe.quotas) {
      setMemberCount(`/${gStripe.quotas?.memberCount ?? '-'}人`);
      setLockCount(`/${gStripe.quotas?.lockCount ?? '-'}台`);
    }
  }, [gStripe.quotas, gStripe.customerInfo]);

  return (
    <>
      <Typography
        variant="h3"
        sx={
          homeCards
            ? { m: '12px 32px 0', fontSize: 15, fontWeight: 400, color: ios.secondaryLabel }
            : { m: '24px 24px 0px 24px' }
        }
      >
        {t('index.WelcomeTo')}
      </Typography>

      <Stack direction="column" spacing={4} sx={{ p: homeCards ? '10px 16px 16px' : '18px' }}>
        <Stack
          direction={gMediaType.isMobile ? 'column' : 'row'}
          spacing={homeCards ? 0 : 2}
          sx={
            homeCards
              ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }
              : undefined
          }
        >
          <Box component={Link} to={'/biz/employees/list'} sx={statSx}>
            <Typography>ユーザー数</Typography>
            <Typography style={numberStyle}>
              {gManageEmployee.employees?.count || 0}
              <span style={unitStyle}>{memberCount}</span>
            </Typography>
          </Box>
          <Box component={Link} to={'/biz/devices/list'} sx={statSx}>
            <Typography>ドア数</Typography>
            <Typography style={numberStyle}>
              {gManageDevice.filteredSsmDevices?.length || 0}
              <span style={unitStyle}>{lockCount}</span>
            </Typography>
          </Box>
          <Box component={Link} to={'/biz/access-control/index'} sx={statSx}>
            <Typography>認証機器数</Typography>
            <Typography style={numberStyle}>
              {gManageDevice.filteredAccessControlDevices?.length || 0}
              <span style={unitStyle}>台</span>
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </>
  );
};

export default BizHomePage;
