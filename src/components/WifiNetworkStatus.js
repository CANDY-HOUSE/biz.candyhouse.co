import { Box, CircularProgress } from '@mui/material';
import { CheckCircleOutline, Language, Remove, Wifi, SignalCellularAlt, LanOutlined } from '@mui/icons-material';

export default function WifiNetworkStatus({ status = {}, resolved = true, hub3Pro = false, connectivity = {} }) {
  const { isAPWork, isNetwork, isIoTWork, isBindingAPWork, isConnectingNetwork, isConnectingIoT } = status;
  const renderIcon = (IconComponent, isLoading, isActive, step1, customSx = {}) => (
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
          color: isActive ? 'primary.main' : 'title.other',
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
              {renderIcon(LanOutlined, false, connectivity.ethernet, true, { marginRight: -2.5 })}
              {renderIcon(SignalCellularAlt, false, connectivity.lte, true, { marginRight: -2.5 })}
              {renderIcon(Wifi, false, connectivity.wifi, true)}
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
