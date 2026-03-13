import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Box, Card, IconButton, Typography, Switch, List, ListItem, ListItemText } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ACTION_TYPES } from '@constants/messageConstants';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import MobileBatteryTrendChart from './MobileBatteryTrendChart';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { biz3utils } from '@/utils/biz3utils';
import { gUtils } from '@/utils/gUtils';

const MobileBatteryChart = ({ deviceUUID: userDeviceUUID }) => {
  const { gManageDevice, gStripe } = useContext(GlobalStateContext);
  const [chartData, setChartData] = useState([]);
  const [lastKey, setLastKey] = useState(null);
  const [isRechargeableBattery, setIsRechargeableBattery] = useState(false);
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

  const handleSwitchChange = (event) => {
    const newValue = event.target.checked;
    setIsRechargeableBattery(newValue);
    gManageDevice.switchRechargebleBattery({ deviceUUID, isRechargeBattery: newValue }, (res) => {
      if (!res.success) {
        setIsRechargeableBattery(!newValue);
      } else {
        gManageDevice.getCompanyDevices(true);
        // App 刷新首页
        if (
          !biz3utils.triggerBridge({
            action: 'requestRefreshApp',
          })
        ) {
          console.log('not in app');
        }
      }
    });
  };

  useEffect(() => {
    if (gStripe.isFromApp) {
      gManageDevice.getCompanyDevices(true);
      return;
    }
  }, [gStripe.isFromApp]);

  const device = useMemo(() => {
    return gManageDevice.companyDevices.find((d) => d.deviceUUID === deviceUUID);
  }, [gManageDevice.companyDevices]);

  useEffect(() => {
    if (device) {
      setIsRechargeableBattery(device.stateInfo?.isRechargeBattery);
    }
  }, [device]);

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
        <MobileBatteryTrendChart
          chartData={chartData}
          onLoadMore={() => {
            lastKey && getBatteryRecord(lastKey);
          }}
          height={isFromApp ? 300 : 400}
        />
        {!gUtils.isWifiModel(device?.deviceModel) && (
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemText
                primary={
                  <Typography sx={{ fontSize: 14 }}>
                    {t('pages.sesameAccessControlDevice.index.RechargeableBattery')}
                  </Typography>
                }
              />
              <Switch checked={isRechargeableBattery} onChange={handleSwitchChange} />
            </ListItem>
          </List>
        )}
      </Card>
    </>
  );
};

export default MobileBatteryChart;
