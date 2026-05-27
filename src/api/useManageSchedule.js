import { ACTION_TYPES } from '@constants/messageConstants';
import { sendMessage, useWebSocket } from '@hooks/useWebSocket.ts';
import { useCallback, useState } from 'react';
import { useCallbacks } from '../hooks/useCallbacks.js';

const useManageSchedule = (gStripe) => {
  const init = { count: 0, Items: [] };
  const [schedules, setSchedules] = useState(init);
  const { registerCallback, invokeCallbacks } = useCallbacks();

  const getScheduleList = useCallback(
    (cb) => {
      const subUUID = gStripe.customerInfo.subUUID;
      if (!subUUID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_SCHEDULE,
        userId: subUUID,
        op: 'getScheduleList',
      };
      sendMessage(messageData);
      registerCallback(ACTION_TYPES.BIZ3_SCHEDULE, messageData.op, cb);
    },
    [gStripe.customerInfo.subUUID]
  );

  const handleScheduleResponse = useCallback(
    (message) => {
      invokeCallbacks(message);
      switch (message.action) {
        case ACTION_TYPES.BIZ3_SCHEDULE:
          switch (message.op) {
            case 'getScheduleList':
              const data = {
                count: message.data.length,
                Items: message.data,
              };
              setSchedules(data);
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    },
    [invokeCallbacks]
  );

  const cancelSchedule = useCallback(
    (scheduleId, cb) => {
      const subUUID = gStripe.customerInfo.subUUID;
      if (!subUUID) return;
      const messageData = {
        action: ACTION_TYPES.BIZ3_SCHEDULE,
        userId: subUUID,
        scheduleId,
        op: 'cancelSchedule',
      };
      sendMessage(messageData);
      registerCallback(ACTION_TYPES.BIZ3_SCHEDULE, messageData.op, cb);
    },
    [gStripe.customerInfo.subUUID]
  );

  useWebSocket(ACTION_TYPES.BIZ3_SCHEDULE, handleScheduleResponse);

  return { schedules, setSchedules, getScheduleList, cancelSchedule };
};

export default useManageSchedule;
