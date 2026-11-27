import BackButton from '@/components/BackButton';
import React, { useContext, useEffect, useState } from 'react';
import { Box, Divider, List, ListItem, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useSettingsBack, useSettingsSearchParams } from '@/components/settingsSubPage';
import SettingsGroup, { settingsPageSx } from '@/components/SettingsGroup';
import { ios } from '@/theme/appHomeStyle';

const formatValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// 将工厂信息拍平成 [{key, value}]。兼容对象、单键对象数组两种返回结构。
const flattenFactoryInfo = (data) => {
  if (!data) return [];
  const rows = [];
  const pushObj = (obj) => {
    Object.keys(obj).forEach((key) => rows.push({ key, value: formatValue(obj[key]) }));
  };
  if (Array.isArray(data)) {
    data.forEach((item) => item && typeof item === 'object' && pushObj(item));
  } else if (typeof data === 'object') {
    pushObj(data);
  }
  return rows;
};

const FactoryInfoDetail = () => {
  const { t } = useTranslation();
  const back = useSettingsBack();
  const { gManageDevice } = useContext(GlobalStateContext);
  const [searchParams] = useSettingsSearchParams();
  const deviceUUID = searchParams.get('deviceUUID');
  const isFromApp = searchParams.get('fromType') === 'app';

  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!deviceUUID) {
      return;
    }
    gManageDevice.getFactoryInfo(deviceUUID, (res) => {
      if (res?.success === false) return;
      setRows(flattenFactoryInfo(res?.data));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceUUID]);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', ...settingsPageSx, pt: 0 }}>
      {!isFromApp && (
        <Box sx={{ display: 'flex', alignItems: 'center', pt: 1, pl: 2 }}>
          <BackButton onClick={() => back()} disableRipple>
            <Typography variant="h3" sx={{ color: 'title.main' }}>
              {searchParams.get('deviceName')}
            </Typography>
          </BackButton>
        </Box>
      )}

      {rows.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ color: ios.secondaryLabel }}>
            {t('envSnapshot.noData', 'No Data')}
          </Typography>
        </Box>
      ) : (
        <SettingsGroup sx={{ pt: '16px' }}>
          <List disablePadding>
            {rows.map((row, index) => (
              <React.Fragment key={`${row.key}-${index}`}>
                <ListItem
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    py: '14px',
                    px: 2,
                  }}
                >
                  <Typography sx={{ fontSize: 17, color: ios.label, mr: 2, flexShrink: 0 }}>
                    {t(`factoryInfo.${row.key}`, row.key)}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 17, color: ios.secondaryLabel, textAlign: 'right', wordBreak: 'break-all' }}
                  >
                    {row.value}
                  </Typography>
                </ListItem>
                <Divider variant="middle" sx={{ opacity: 0.4 }} />
              </React.Fragment>
            ))}
          </List>
        </SettingsGroup>
      )}
    </Box>
  );
};

export default FactoryInfoDetail;
