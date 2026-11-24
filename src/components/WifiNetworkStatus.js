import { Box, CircularProgress } from '@mui/material';
import { CheckCircleOutline, Language, Remove, Wifi, SignalCellularAlt, LanOutlined } from '@mui/icons-material';

// Hub3 Pro 备用链路颜色：与设备指示灯一致（在用绿、备用蓝、未连灰）
const STANDBY_COLOR = '#1E88E5';
// 与固件默认优先级一致：有线 LAN > WiFi > SIM
const NET_PRIORITY = ['ethernet', 'wifi', 'lte'];

// activeNet：设备上报的当前承载网络（netSwitchInfo.active）；未上报时按优先级取第一个已连接的
export default function WifiNetworkStatus({
  status = {},
  resolved = true,
  hub3Pro = false,
  connectivity = {},
  activeNet,
}) {
  const { isAPWork, isNetwork, isIoTWork, isBindingAPWork, isConnectingNetwork, isConnectingIoT } = status;
  const inUse = connectivity[activeNet] ? activeNet : NET_PRIORITY.find((net) => connectivity[net]);
  const linkColor = (net) => (!connectivity[net] ? 'title.other' : net === inUse ? 'primary.main' : STANDBY_COLOR);
  const renderIcon = (IconComponent, isLoading, isActive, step1, customSx = {}, iconColor) => (
    <Box key={IconComponent.name} sx={{ display: 'flex', alignItems: 'center', ...customSx }}>
      <Box sx={{ width: 25, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isLoading ? (
          <CircularProgress size={14} sx={{ color: 'primary.main' }} />
        ) : !!step1 ? (
          <></>
        ) : (
          <Remove sx={{ color: isActive ? 'primary.main' : 'title.other' }} />
        )}
      </Box>
      <IconComponent
        sx={{
          color: iconColor || (isActive ? 'primary.main' : 'title.other'),
        }}
      />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {!resolved ? (
        <Box sx={{ width: 25, height: 24 }} />
      ) : (
        <>
          {hub3Pro ? (
            <>
              {renderIcon(
                LanOutlined,
                false,
                connectivity.ethernet,
                true,
                { marginRight: -2.5 },
                linkColor('ethernet')
              )}
              {renderIcon(SignalCellularAlt, false, connectivity.lte, true, { marginRight: -2.5 }, linkColor('lte'))}
              {renderIcon(Wifi, false, connectivity.wifi, true, {}, linkColor('wifi'))}
            </>
          ) : (
            <>{renderIcon(Wifi, isAPWork ? false : isBindingAPWork, isAPWork, true)}</>
          )}
          {renderIcon(Language, isNetwork ? false : isConnectingNetwork, isNetwork)}
          {renderIcon(CheckCircleOutline, isIoTWork ? false : isConnectingIoT, isIoTWork)}
        </>
      )}
    </Box>
  );
}
