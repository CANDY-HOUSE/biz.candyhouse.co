import React, { useContext, useEffect, useState } from 'react';
import { Box, Divider, IconButton, List, ListItem, Typography } from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';

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
  const navigate = useNavigate();
  const { gStripe, gManageDevice } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const deviceUUID = searchParams.get('deviceUUID');

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
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.paper' }}>
      {!gStripe.isFromApp && (
        <Box sx={{ display: 'flex', alignItems: 'center', pt: 1, pl: 2 }}>
          <IconButton onClick={() => navigate(-1)} disableRipple>
            <KeyboardArrowLeftIcon sx={{ ml: -2 }} />
            <Typography variant="h3" sx={{ color: 'title.main' }}>
              {searchParams.get('deviceName')}
            </Typography>
          </IconButton>
        </Box>
      )}

      {rows.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ color: 'info.light' }}>
            {t('envSnapshot.noData', 'No Data')}
          </Typography>
        </Box>
      ) : (
        <List>
          {rows.map((row, index) => (
            <React.Fragment key={`${row.key}-${index}`}>
              <ListItem
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  py: 1,
                  px: 2,
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 400, color: 'title.main', mr: 2 }}>
                  {t(`factoryInfo.${row.key}`, row.key)}
                </Typography>
                <Typography variant="body1" sx={{ color: 'info.light', textAlign: 'right', wordBreak: 'break-all' }}>
                  {row.value}
                </Typography>
              </ListItem>
              <Divider variant="middle" sx={{ opacity: 0.4 }} />
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FactoryInfoDetail;
