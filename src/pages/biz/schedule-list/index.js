import { GlobalStateContext } from '@context/GlobalContextProvider';
import ClearIcon from '@mui/icons-material/Clear';
import { Box, List, ListItem, ListItemText, Tooltip, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useContext, useEffect, useRef } from 'react';

const ACTION_LABELS = {
  lock: 'lock',
  unlock: 'unlock',
  upgrade_firmware: 'upgrade firmware',
};

const formatActionText = (action = '') => {
  const raw = String(action).trim();
  if (!raw) return '';

  const normalized = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (ACTION_LABELS[normalized]) return ACTION_LABELS[normalized];

  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatTimeText = (displayTime = '') => {
  const text = String(displayTime).trim();
  if (!text) return '';

  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(text) || /^\d{2}:\d{2}$/.test(text)) {
    return ` at ${text}`;
  }

  return ` ${text}`;
};

const ScheduleList = () => {
  const { gStripe, gSchedule } = useContext(GlobalStateContext);
  const containerRef = useRef(null);

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

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        <List>
          {gSchedule.schedules.Items.map((item) => {
            const actionText = formatActionText(item.action);
            const timeText = formatTimeText(item.displayTime);

            return (
              <ListItem
                key={`${item.scheduleId}`}
                sx={{
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body1">
                      {item.deviceName} will {actionText}
                      {timeText}
                    </Typography>
                  }
                />

                <Tooltip title="Cancel Schedule">
                  {item.isCancelling ? (
                    <CircularProgress size={18} color="inherit" aria-label="Loading" />
                  ) : (
                    <ClearIcon sx={{ cursor: 'pointer' }} onClick={() => handleCancelSchedule(item.scheduleId)} />
                  )}
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default ScheduleList;
