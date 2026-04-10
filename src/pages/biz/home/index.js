import React, { useContext, useEffect, useState } from 'react';
import { Typography, Stack, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';

const BizHomePage = () => {
  const { t } = useTranslation();
  const { gManageEmployee, gStripe, gManageDevice, gMediaType } = useContext(GlobalStateContext);

  const [memberCount, setMemberCount] = useState('');
  const [lockCount, setLockCount] = useState('');

  const noLimit = '/無制限';

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
      <Typography variant="h3" sx={{ m: '24px 24px 0px 24px' }}>
        {t('index.WelcomeTo')}
      </Typography>

      <Stack direction="column" spacing={4} sx={{ p: '18px' }}>
        <Stack direction={gMediaType.isMobile ? 'column' : 'row'} spacing={2}>
          <Box
            component={Link}
            to={'/biz/employees/list'}
            sx={{
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
            }}
          >
            <Typography>ユーザー数</Typography>
            <Typography
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
              }}
            >
              {gManageEmployee.employees?.count || 0}
              <span style={{ fontSize: '20px', fontWeight: 'normal' }}>{memberCount}</span>
            </Typography>
          </Box>
          <Box
            component={Link}
            to={'/biz/devices/list'}
            sx={{
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
            }}
          >
            <Typography>ドア数</Typography>
            <Typography
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
              }}
            >
              {gManageDevice.filteredSsmDevices?.length || 0}
              <span style={{ fontSize: '20px', fontWeight: 'normal' }}>{lockCount}</span>
            </Typography>
          </Box>
          <Box
            component={Link}
            to={'/biz/access-control/index'}
            sx={{
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
            }}
          >
            <Typography>認証機器数</Typography>
            <Typography
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
              }}
            >
              {gManageDevice.filteredAccessControlDevices?.length || 0}
              <span style={{ fontSize: '20px', fontWeight: 'normal' }}>台</span>
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </>
  );
};

export default BizHomePage;
