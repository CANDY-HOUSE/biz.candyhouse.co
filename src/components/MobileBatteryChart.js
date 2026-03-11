import React, { useCallback, useEffect, useState } from 'react';
import { Box, Card, CardContent, IconButton, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ACTION_TYPES } from '@constants/messageConstants';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import MobileBatteryTrendChart from './MobileBatteryTrendChart';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useTranslation } from 'react-i18next';

const MobileBatteryChart = ({ deviceUUID: userDeviceUUID }) => {
  const [chartData, setChartData] = useState([]);
  const [lastKey, setLastKey] = useState(null);
  const [searchParams] = useSearchParams();
  const deviceUUID = searchParams.get('deviceUUID') || userDeviceUUID;
  const isWifiModule = deviceUUID.startsWith('00000000-055A-FD81-0D00');
  const isFromApp = searchParams.get('fromType') === 'app';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isSettingPush = Boolean(searchParams.get('setting')) === true;

  const getBatteryRecordCallback = useCallback((message) => {
    const processedData = (message.data.records || []).map((item) => ({
      time: new Date(item.ts * 1000).toLocaleString(),
      timestamp: item.ts,
      light: item.light / 1000,
      heavy: item.heavy > -1 ? item.heavy / 1000 : undefined,
      lightPercentage: item.lightPercentage,
      heavyPercentage: item.heavyPercentage,
    }));
    setLastKey(message.data.lastEvaluatedKey);
    setChartData((prevData) => [...processedData, ...prevData]);
  }, []);

  useWebSocket(ACTION_TYPES.BIZ3_GET_BATTERY_RECORD, getBatteryRecordCallback);

  const getBatteryRecord = async (lastKey = null) => {
    const msgData = {
      action: ACTION_TYPES.BIZ3_GET_BATTERY_RECORD,
      deviceUUID,
      lastEvaluatedKey: lastKey,
      pageSize: isFromApp ? 50 : 100,
      op: 'batch-get',
    };
    sendMessage(msgData);
  };

  useEffect(() => {
    if (isWifiModule) {
      setChartData([
        { time: '', timestamp: 1, light: 5, heavy: 5, lightPercentage: 100, heavyPercentage: 100 },
        { time: '', timestamp: 2, light: 5, heavy: 5, lightPercentage: 100, heavyPercentage: 100 },
      ]);
    } else {
      getBatteryRecord();
    }
  }, []);

  return (
    <>
      {!isFromApp && isSettingPush && (
        <Box sx={{ display: 'flex', alignItems: 'center', pt: 1, pl: 2 }}>
          <IconButton onClick={() => navigate(-1)} disableRipple>
            <KeyboardArrowLeftIcon sx={{ ml: -2 }} />
            <Typography variant="h3" sx={{ color: 'title.main' }}>
              {t('pages.login.ReturnToMailInput')}
            </Typography>
          </IconButton>
        </Box>
      )}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <MobileBatteryTrendChart
            chartData={chartData}
            onLoadMore={() => {
              lastKey && getBatteryRecord(lastKey);
            }}
            height={isFromApp ? 300 : 400}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default MobileBatteryChart;
