import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  IconButton,
  Typography,
  Switch,
  List,
  ListItem,
  ListItemText,
  Drawer,
  ListItemButton,
} from '@mui/material';
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
  const { gManageDevice, gMediaType } = useContext(GlobalStateContext);
  const [chartData, setChartData] = useState([]);
  const [lastKey, setLastKey] = useState(null);
  const [isRechargeableBattery, setIsRechargeableBattery] = useState(false);
  const [menuState, setMenuState] = useState({ open: false, selectedPoint: null });
  const [searchParams] = useSearchParams();
  const deviceUUID = searchParams.get('deviceUUID') || userDeviceUUID;
  const isWifiModule = gUtils.isWifiModulePrefix(deviceUUID);
  const isFromApp = searchParams.get('fromType') === 'app';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isSettingPush = Boolean(searchParams.get('setting')) === true;

  const getBatteryRecordCallback = useCallback((message) => {
    if (message.action !== ACTION_TYPES.BIZ3_GET_BATTERY_RECORD) return;
    if (message.op === 'batch-get') {
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
    } else if (message.op === 'makeInvisible') {
      message.success &&
        setChartData((prevData) => prevData.filter((item) => item.timestamp !== message.data.timestamp_second));
    }
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

  const makeInvisibleRecord = ({ deviceUUID, timestamp_second }) => {
    if (isWifiModule) return;
    const msgData = {
      action: ACTION_TYPES.BIZ3_GET_BATTERY_RECORD,
      deviceUUID,
      timestamp_second,
      op: 'makeInvisible',
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
        // App 刷新首页
        if (
          !biz3utils.triggerBridge({
            action: 'requestRefreshApp',
          })
        ) {
          gManageDevice.getCompanyDevices();
          console.log('not in app');
        }
        setChartData([]);
        getBatteryRecord();
      }
    });
  };

  useEffect(() => {
    gManageDevice.getDeviceStatus(deviceUUID);
  }, [deviceUUID]);

  const device = useMemo(() => {
    return gManageDevice.companyDevices.find((d) => d.deviceUUID === deviceUUID) || gManageDevice.deviceStatus;
  }, [gManageDevice.companyDevices, gManageDevice.deviceStatus, deviceUUID]);

  useEffect(() => {
    if (device) {
      setIsRechargeableBattery(device.stateInfo?.isRechargeBattery);
    }
  }, [device]);

  const handleCloseMenu = () => {
    setMenuState({ open: false, selectedPoint: null });
  };

  const handleDeleteRecord = () => {
    if (menuState.selectedPoint) {
      const { timestamp } = menuState.selectedPoint;
      makeInvisibleRecord({ deviceUUID, timestamp_second: timestamp });
    }
    handleCloseMenu();
  };

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
          showDeleteButton={gMediaType.isMobile}
          chartData={chartData}
          lastKey={lastKey}
          onLoadMore={() => {
            lastKey && getBatteryRecord(lastKey);
          }}
          height={isFromApp ? 300 : 400}
          onDeleteItemPress={({ payload }) => {
            setMenuState({ open: true, selectedPoint: payload });
          }}
          isMenuOpen={menuState.open}
          enablePressDeleteTrigger={!gMediaType.isMobile && !isFromApp}
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
                secondary={
                  !gUtils.isSupportRechargeableBattery(device?.deviceModel) && (
                    <Typography sx={{ fontSize: 10, color: 'error.main' }}>
                      {t('pages.sesameAccessControlDevice.index.RechargeableBatteryNotice')}
                    </Typography>
                  )
                }
              />
              <Switch checked={isRechargeableBattery} onChange={handleSwitchChange} />
            </ListItem>
          </List>
        )}
      </Card>
      <Drawer anchor="bottom" open={menuState.open} variant="temporary" onClose={handleCloseMenu}>
        <List sx={{ pb: 1, justifyContent: 'center' }} disablePadding>
          <ListItem disablePadding>
            <ListItemButton onClick={handleDeleteRecord}>
              <ListItemText
                primary={t('pages.ir.remote.delete')}
                sx={{
                  textAlign: 'center',
                  color: 'error.main',
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={handleCloseMenu}>
              <ListItemText primary={t('pages.ir.remote.cancel')} sx={{ textAlign: 'center' }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
};

export default MobileBatteryChart;
