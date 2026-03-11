import BluetoothIcon from '@mui/icons-material/Bluetooth';
import MotionPhotosAutoIcon from '@mui/icons-material/MotionPhotosAuto';
import PanToolIcon from '@mui/icons-material/PanTool';
import WifiIcon from '@mui/icons-material/Wifi';
import ComputerRoundedIcon from '@mui/icons-material/ComputerRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import React from 'react';
import { SensorDoor } from '@mui/icons-material';
import i18n from '@/i18n';

const style = {
  color: '#ffffff',
  fontSize: '30px',
  padding: '5px',
  borderRadius: '100%',
};
// [eddy todo] 应在服务端完成
const ManualContent = ({ type }) => {
  switch (type) {
    case 6:
      return 'AUTO';
    case 7:
      return i18n.t('pages.sesameAccessControlDevice.event.manualLock');
    case 8:
    case 9:
      return i18n.t('pages.sesameAccessControlDevice.event.manualUnlock');
    case 18:
      return 'Bluetooth Click';
    case 19:
      return 'Wifi Click';
    case 20:
      return 'Web Click';
    default:
      return '';
  }
};

const ViaView = ({ type }) => {
  switch (type) {
    case 1:
    case 2:
    case 18:
    case 90:
    case 91:
      return (
        <BluetoothIcon
          sx={{
            color: (theme) => theme.palette.info.light,
          }}
        />
      );
    case 6:
      return (
        <MotionPhotosAutoIcon
          sx={{
            color: (theme) => theme.palette.info.light,
          }}
        />
      );
    case 7:
    case 8:
    case 9:
      return (
        <PanToolIcon
          sx={{
            color: (theme) => theme.palette.info.light,
          }}
        />
      );
    case 14:
    case 15:
    case 19:
      return (
        <WifiIcon
          sx={{
            color: (theme) => theme.palette.info.light,
          }}
        />
      );
    case 16:
    case 17:
    case 20:
      return (
        <ComputerRoundedIcon
          sx={{
            color: (theme) => theme.palette.info.light,
          }}
        />
      );
    default:
      return '';
  }
};
const StatusView = ({ type }) => {
  switch (type) {
    case 1:
    case 6:
    case 7:
    case 14:
    case 16:
      return <LockOutlinedIcon sx={{ ...style, backgroundColor: 'error.light' }} />;
    case 2:
    case 8:
    case 9:
    case 15:
    case 17:
      return <LockOpenOutlinedIcon sx={{ ...style, backgroundColor: 'primary.light' }} />;
    case 18:
    case 19:
    case 20:
      return <TouchAppIcon sx={{ ...style, backgroundColor: 'primary.light' }} />;
    case 90:
      return <SensorDoor sx={{ ...style, backgroundColor: 'primary.light' }} />;
    case 91:
      return <SensorDoor sx={{ ...style, backgroundColor: 'error.light' }} />;
    default:
      return '';
  }
};

export const CmHistoryExt = {
  ViaView,
  StatusView,
  ManualContent,
};
