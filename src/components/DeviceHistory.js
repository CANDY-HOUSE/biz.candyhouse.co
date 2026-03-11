import React, { useContext, useEffect, useMemo, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { CircularProgress, Backdrop, Box, Tooltip, IconButton } from '@mui/material'; // 添加导入
import { gUtils } from '@/utils/gUtils';
import { useSearchParams } from 'react-router-dom';
import MobileDeviceHistory from './MobileDeviceHistory';
import SimCardDownloadIcon from '@mui/icons-material/SimCardDownload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import BlurOverlay from './BlurOverlay';

export default function DeviceHistory({ deviceUUID: propDeviceUUID, showToolBar = false }) {
  const { gManageGroup, gStripe } = useContext(GlobalStateContext);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [timestamp, setTimestamp] = useState(undefined);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchParams] = useSearchParams();
  const searchDeviceUUID = searchParams.get('deviceUUID');
  const keyLevel = searchParams.get('keyLevel');
  const deviceUUID = propDeviceUUID || searchDeviceUUID;
  const noToolBar = gStripe.isFromApp || !showToolBar;

  const loadHistory = (lastKey = null, cb) => {
    gManageGroup.getDeviceHistory([{ deviceUUID, lastKey }], (resp) => {
      const res = resp.data || [];
      setDeviceHistory((prev) => [...prev, ...res]);
      if (res.length > 0) {
        const newLastKey = res[res.length - 1]?.timestamp;
        setTimestamp(newLastKey);
        cb && cb(newLastKey);
      } else {
        cb && cb(null);
      }
    });
  };

  const downloadDeviceHistory = async (isCsv) => {
    if (deviceHistory.length < 1 || isDownloading) {
      return;
    }
    let allHistory = [];
    setIsDownloading(true);
    const pageSize = 100;
    const fetchAllHistory = async (currentLastKey = null) => {
      return new Promise((resolve) => {
        gManageGroup.getDeviceHistory(
          [{ deviceUUID, lastKey: currentLastKey }],
          (resp) => {
            const res = resp.data || [];
            allHistory = [...allHistory, ...res];
            if (res.length > 0 && res.length === pageSize) {
              const newLastKey = res[res.length - 1]?.timestamp;
              setTimeout(() => {
                fetchAllHistory(newLastKey).then(resolve);
              }, 100);
            } else {
              setIsDownloading(false);
              resolve();
            }
          },
          pageSize
        );
      });
    };
    await fetchAllHistory();
    if (allHistory.length > 0) {
      gUtils.csvUtils.downloadLists(allHistory, isCsv);
    }
  };

  useEffect(() => {
    if (deviceUUID) {
      loadHistory(null);
    }
  }, [deviceUUID]);

  const disableInteraction = useMemo(() => {
    return parseInt(keyLevel) === 2;
  }, [keyLevel]);

  const content = noToolBar ? (
    <MobileDeviceHistory
      histories={deviceHistory}
      onLoadMore={(cb) => {
        loadHistory(timestamp, (lastKey) => {
          cb(lastKey);
        });
      }}
    />
  ) : (
    <>
      <Box>
        <Tooltip title="CSVダウンロード">
          <IconButton onClick={() => downloadDeviceHistory(true)}>
            <CloudDownloadIcon fontSize="small" sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Excelダウンロード">
          <IconButton onClick={() => downloadDeviceHistory(false)}>
            <SimCardDownloadIcon fontSize="small" sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
          </IconButton>
        </Tooltip>
        <Box
          sx={{
            height: '480px',
            overflow: 'auto',
            bgcolor: 'background.paper',
            mr: 0,
            mt: 1,
          }}
        >
          <MobileDeviceHistory
            fullHeight={false}
            histories={deviceHistory}
            onLoadMore={(cb) => {
              loadHistory(timestamp, (lastKey) => {
                cb(lastKey);
              });
            }}
          />
        </Box>
      </Box>
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        open={isDownloading}
      >
        <CircularProgress color="inherit" />
        <div>履歴データをダウンロード中...</div>
      </Backdrop>
    </>
  );

  return <BlurOverlay enabled={disableInteraction}>{content}</BlurOverlay>;
}
