import React from 'react';
import { SvgIcon, Typography, ListItem, ListItemText, Divider, ListItemIcon } from '@mui/material';
import { SvgArrow } from '@/assets/svg/svgLock';
import { useTranslation } from 'react-i18next';
import { PATHS } from '@/routes/manifest';
import { useSettingsNavigate } from '@/components/settingsSubPage';

const BatteryPercent = ({ device }) => {
  const { t } = useTranslation();
  const navigate = useSettingsNavigate();

  return (
    <>
      <ListItem
        onClick={() => {
          const url = new URL(window.location.href);
          const newSearchParams = new URLSearchParams(url.searchParams);
          const did = newSearchParams.get('did');
          did && newSearchParams.set('deviceUUID', did);
          newSearchParams.set('deviceName', device.deviceName || '');
          newSearchParams.set('setting', true);
          newSearchParams.delete('did');
          navigate({
            pathname: PATHS.deviceSetting.batteryTrend,
            search: newSearchParams.toString(),
          });
        }}
      >
        <ListItemText primary={t('pages.sesameAccessControlDevice.index.Battery')} />
        <Typography
          sx={{ color: 'title.other' }}
        >{`${device.stateInfo?.batteryPercentage != null ? `${device.stateInfo.batteryPercentage}%` : 'unknown'}`}</Typography>
        <ListItemIcon sx={{ minWidth: 'auto' }}>
          <SvgIcon component={SvgArrow} />
        </ListItemIcon>
      </ListItem>
      <Divider variant="middle" sx={{ opacity: 0.4 }} />
    </>
  );
};

export default BatteryPercent;
