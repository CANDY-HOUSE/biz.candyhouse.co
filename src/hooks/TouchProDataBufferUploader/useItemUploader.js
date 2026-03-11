import { useState, useEffect, useRef } from 'react';
import { Buffer } from 'buffer';
import { registerIotCallback } from '../useIotCallbackRegistry';

const useItemUploader = (sendCmd, config) => {
  const [uploadState, setUploadState] = useState('Idle');
  const itemsToPostRef = useRef(null);
  const currentDataIndexRef = useRef(0);
  const itemsDataRef = useRef(null);
  const callbackRefRef = useRef(null);
  const resolvePromiseRef = useRef(null);
  const rejectPromiseRef = useRef(null);
  const MAX_PACKET_SIZE = 4910;

  const cleanup = () => {
    itemsToPostRef.current = null;
    itemsDataRef.current = null;
    currentDataIndexRef.current = 0;
    resolvePromiseRef.current = null;
    rejectPromiseRef.current = null;
    setUploadState('Idle');
    if (callbackRefRef.current) {
      callbackRefRef.current();
      callbackRefRef.current = null;
    }
  };

  const sendDataPacket = async () => {
    try {
      if (!itemsDataRef.current) return;

      const totalLength = itemsDataRef.current.length;
      console.log('总长度', totalLength);
      const currentIndex = currentDataIndexRef.current;

      if (currentIndex < totalLength) {
        const copyLength = Math.min(MAX_PACKET_SIZE - 5, totalLength - currentIndex);

        const payload = new Uint8Array(copyLength + 5);
        payload[0] = config.cmdCode;
        payload[1] = currentIndex & 0xff;
        payload[2] = (currentIndex >> 8) & 0xff;
        payload[3] = totalLength & 0xff;
        payload[4] = (totalLength >> 8) & 0xff;
        payload.set(itemsDataRef.current.subarray(currentIndex, currentIndex + copyLength), 5);
        console.log('下发的数据', payload);

        const base64 = Buffer.from(payload).toString('base64');
        const deviceUUID = itemsToPostRef.current.deviceUUID;
        const cmd = {
          topic: `stp${deviceUUID}cmd`,
          payload: base64,
          op: config.cmdCode,
        };

        currentDataIndexRef.current += copyLength;
        await sendCmd(cmd);
      }
    } catch (error) {
      console.error(`Error sending data packet:`, error);
      setUploadState('Error');
      if (rejectPromiseRef.current) {
        rejectPromiseRef.current(error);
      }
      cleanup();
    }
  };

  useEffect(() => {
    const itemsAddCallback = async (deviceUUID, data) => {
      if (!data || typeof data.status !== 'string') return;

      setUploadState(data.status);

      if (data.status === 'Ok') {
        if (itemsToPostRef.current && resolvePromiseRef.current) {
          try {
            resolvePromiseRef.current({
              deviceUUID: itemsToPostRef.current.deviceUUID,
              list: itemsToPostRef.current.list,
            });
          } catch (error) {
            console.error(`Failed to resolve promise:`, error);
            if (rejectPromiseRef.current) {
              rejectPromiseRef.current(error);
            }
          } finally {
            cleanup();
          }
        } else {
          cleanup();
        }
      } else if (data.status !== 'Pending') {
        currentDataIndexRef.current = parseInt(data.status.split('/')[0], 10) - 1;
        sendDataPacket();
      }
    };
    const unregister = registerIotCallback(config.cmdCode, itemsAddCallback);
    callbackRefRef.current = unregister;
    return () => {
      if (callbackRefRef.current) {
        callbackRefRef.current();
      }
    };
  }, [sendCmd, config.cmdCode]);

  const uploadItemBatch = async ({ deviceUUID, list }) => {
    if (!deviceUUID || !Array.isArray(list) || list.length === 0) {
      return Promise.reject(new Error('Invalid parameters'));
    }
    cleanup();
    // eslint-disable-next-line
    return new Promise(async (resolve, reject) => {
      try {
        resolvePromiseRef.current = resolve;
        rejectPromiseRef.current = reject;

        itemsToPostRef.current = {
          deviceUUID,
          list,
        };

        itemsDataRef.current = config.prepareData(list);

        currentDataIndexRef.current = 0;
        setUploadState('Processing');

        await sendDataPacket();
      } catch (error) {
        console.error(`Error preparing data:`, error);
        reject(error);
        cleanup();
      }
    });
  };

  return {
    uploadItemBatch,
    uploadState,
  };
};

export default useItemUploader;
