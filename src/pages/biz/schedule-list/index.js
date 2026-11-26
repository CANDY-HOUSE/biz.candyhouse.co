import { GlobalStateContext } from '@context/GlobalContextProvider';
import ClearIcon from '@mui/icons-material/Clear';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { useTranslation } from 'react-i18next';
import { PcPage, PcRow, PcSection } from '@/components/PcGrouped';
import { ios } from '@/theme/appHomeStyle';
import CircularProgress from '@mui/material/CircularProgress';
import { useContext, useEffect } from 'react';

const formatActionText = (action = '') => {
  const raw = String(action).trim();
  if (!raw) return '';

  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const actionIcons = {
  lock: { Icon: LockOutlinedIcon, color: ios.red, bg: ios.redFill },
  unlock: { Icon: LockOpenOutlinedIcon, color: ios.tint, bg: ios.tintFill },
  upgrade_firmware: { Icon: SystemUpdateAltIcon, color: ios.secondaryLabel, bg: ios.fill },
};

const ScheduleList = () => {
  const { gStripe, gSchedule } = useContext(GlobalStateContext);
  const { t } = useTranslation();

  useEffect(() => {
    gSchedule.getScheduleList();
  }, [gStripe.customerInfo]);

  const handleCancelSchedule = (scheduleId) => {
    gSchedule.setSchedules((prev) => ({
      ...prev,
      Items: prev.Items.map((item) => (item.scheduleId === scheduleId ? { ...item, isCancelling: true } : item)),
    }));
    gSchedule.cancelSchedule(scheduleId);
  };

  const items = gSchedule.schedules.Items;

  return (
    <PcPage title={t('access.scheduleList')}>
      <PcSection>
        {items.length === 0 && (
          <PcRow sx={{ minHeight: 120 }}>
            <Typography sx={{ width: '100%', textAlign: 'center', fontSize: 15, color: ios.secondaryLabel }}>
              {t('bizui.schedule.empty')}
            </Typography>
          </PcRow>
        )}
        {items.map((item) => {
          const action = String(item.action || '')
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_');
          const { Icon, color, bg } = actionIcons[action] || actionIcons.upgrade_firmware;
          const actionText = actionIcons[action] ? t(`bizui.schedule.action.${action}`) : formatActionText(item.action);
          return (
            <PcRow key={`${item.scheduleId}`} sx={{ minHeight: 64 }}>
              <Box
                sx={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: bg,
                }}
              >
                <Icon sx={{ fontSize: 20, color }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <Typography sx={{ fontSize: 16, color: ios.label }}>{item.deviceName}</Typography>
                <Typography sx={{ mt: '2px', fontSize: 14, color: ios.secondaryLabel }}>
                  {actionText}
                  {item.displayTime ? ` · ${item.displayTime}` : ''}
                </Typography>
              </Box>
              <Tooltip title={t('bizui.schedule.cancel')}>
                {item.isCancelling ? (
                  <CircularProgress size={18} aria-label="Loading" sx={{ m: '7px' }} />
                ) : (
                  <IconButton
                    size="small"
                    aria-label={t('bizui.schedule.cancel')}
                    sx={{ mr: '-6px' }}
                    onClick={() => handleCancelSchedule(item.scheduleId)}
                  >
                    <ClearIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                )}
              </Tooltip>
            </PcRow>
          );
        })}
      </PcSection>
    </PcPage>
  );
};

export default ScheduleList;
