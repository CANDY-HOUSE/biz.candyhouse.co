import React, { useContext } from 'react';
import { Box, Divider, IconButton, List, ListItem, Typography } from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Buffer } from 'buffer';
import { GlobalStateContext } from '@context/GlobalContextProvider';

const formatValue = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
};

// 从 URL query 的 base64 参数还原 envSnapshot（兼容 App 新开 webview / 刷新）
const decodeSnapshot = (encoded) => {
  if (!encoded) return null;
  try {
    return JSON.parse(Buffer.from(decodeURIComponent(encoded), 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

// env 为单键对象数组 [{"key": value}, ...]，取每项的 key/value（不考虑嵌套）
const flattenSnapshot = (arr) => {
  if (!Array.isArray(arr)) return [];
  const rows = [];
  arr.forEach((obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach((key) => rows.push({ key, value: formatValue(obj[key]) }));
    }
  });
  return rows;
};

const EnvSnapshotDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gStripe } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const envSnapshot = decodeSnapshot(searchParams.get('data'));

  const rows = envSnapshot ? flattenSnapshot(envSnapshot) : [];

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
                  {t(`envSnapshot.${row.key}`, row.key)}
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

export default EnvSnapshotDetail;
