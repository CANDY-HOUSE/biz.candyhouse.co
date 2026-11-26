import React, { useCallback, useContext, useMemo, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useTranslation } from 'react-i18next';
import { PcPage, PcSection } from '@/components/PcGrouped';
import { useNavigate } from 'react-router-dom';
import { biz3utils } from '@/utils/biz3utils';
import { Buffer } from 'buffer';
import CmDropdownSelect from '@components/biz/device/CmDropdownSelect';
import MobileDeviceHistory from '@components/MobileDeviceHistory';

const HistoryList = () => {
  const { gManageGroup, gManageDevice, gStripe } = useContext(GlobalStateContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [lastKeys, setLastKeys] = useState(undefined);
  const [selectedDeviceId, setSelectedDeviceId] = useState('0'); // '0' 表示全部

  const devices = useMemo(() => {
    return gManageDevice.filteredSsmDevices || [];
  }, [gManageDevice.filteredSsmDevices]);

  // 加载单个设备历史记录
  const loadHistory = useCallback(
    (deviceUUID, lastKey = null, cb) => {
      gManageGroup.getDeviceHistory([{ deviceUUID, lastKey }], (resp) => {
        const res = resp.data || [];
        res.map((item) => {
          const deviceName = devices.find((d) => d.deviceUUID === item.device_id)?.deviceName;
          item.deviceName = deviceName;
          return item;
        });
        setDeviceHistory((prev) => [...prev, ...res]);
        setLastKeys({ [deviceUUID]: res[res.length - 1]?.timestamp });
        cb && cb(res[res.length - 1]?.timestamp);
      });
    },
    [gManageGroup]
  );

  const loadAllDevicesHistory = (lastKeys = {}, cb) => {
    const deviceList = devices.map((device) => ({
      deviceId: device.deviceUUID,
      lastKey: lastKeys[device.deviceUUID] || null,
    }));
    gManageGroup.getDeviceHistory(deviceList, (result) => {
      if (result.success && result.data) {
        const { items, deviceLastKeys, hasMore } = result.data || {};
        items.map((item) => {
          const deviceName = devices.find((d) => d.deviceUUID === item.device_id)?.deviceName;
          item.deviceName = deviceName;
          return item;
        });
        setDeviceHistory((prev) => [...prev, ...items]);
        setLastKeys(deviceLastKeys);
        cb && cb(hasMore);
      }
    });
  };

  // 处理设备选择
  const handleSelectDevice = useCallback(
    (value) => {
      setSelectedDeviceId(value);
      setDeviceHistory([]);
      setLastKeys(undefined);
      if (value === '0') {
        loadAllDevicesHistory({});
      } else {
        loadHistory(value, null);
      }
    },
    [gManageDevice.filteredSsmDevices, loadAllDevicesHistory]
  );

  const handleItemClick = useCallback(
    (item) => {
      gManageGroup.getHistoryEnv({ deviceUUID: item.device_id, timestamp: item.timestamp }, (resp) => {
        const raw = resp?.data ?? {};
        const json = typeof raw === 'string' ? raw : JSON.stringify(raw);
        biz3utils.openEnvSnapshot(Buffer.from(json, 'utf8').toString('base64'), gStripe.isFromApp, navigate);
      });
    },
    [gManageGroup, gStripe.isFromApp, navigate]
  );

  return (
    <PcPage
      title={t('access.historys')}
      action={<CmDropdownSelect callSelect={handleSelectDevice} itemsSelect={gManageDevice.filteredSsmDevices} />}
      sx={{ height: 'calc(100dvh - 68px)', display: 'flex', flexDirection: 'column', pb: '16px' }}
    >
      <PcSection
        sx={{ flex: 1, minHeight: 0, mb: 0, display: 'flex', flexDirection: 'column' }}
        cardSx={{ flex: 1, minHeight: 0 }}
      >
        <MobileDeviceHistory
          key={selectedDeviceId}
          fullHeight={false}
          histories={deviceHistory}
          onLoadMore={(cb) => {
            if (selectedDeviceId === '0') {
              loadAllDevicesHistory(lastKeys, cb);
            } else {
              loadHistory(selectedDeviceId, lastKeys[selectedDeviceId], cb);
            }
          }}
          onItemClick={handleItemClick}
        />
      </PcSection>
    </PcPage>
  );
};

export default HistoryList;
