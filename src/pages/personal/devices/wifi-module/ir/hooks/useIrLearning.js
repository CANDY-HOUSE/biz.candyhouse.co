import { useCallback, useEffect, useRef, useState } from 'react';
import { biz3utils } from '@/utils/biz3utils.js';

export const IR_MODE = {
  CONTROL: 0,
  LEARN: 1,
};

/**
 * 学习红外码（自学习页、非空调页、空调页共用）：右上角「+」进入学习模式，Hub3 学到一个码后
 * 存成这个遥控器的学习按键（addIRCode），然后自动退出学习模式。离开页面时恢复为控制模式。
 *
 * @param {string}   p.hub3DeviceId
 * @param {string}   p.remoteUuid      已保存遥控器的 uuid（学到的按键挂在它下面）
 * @param {boolean}  p.enabled         是否允许学习（遥控器保存后才能学习）
 * @param {boolean}  p.lazy            true：第一次点「+」时才订阅、取当前模式（码库遥控器页，平时只发码，不打扰 Hub3）；
 *                                     false：进入页面就订阅（自学习页）
 * @param {object}   p.api             useRemoteCtrl 的 { getIRMode, setIRMode, subscribeIRMode, subscribeIRData, addIRCode }
 * @param {function} p.onLearned       (row) => void  学到的按键保存成功后调用，row 与 ir_device_keys 的学习按键行一致
 * @param {function} p.onError         (i18nKey) => void  出错时提示
 */
export const useIrLearning = ({ hub3DeviceId, remoteUuid, enabled, lazy = false, api, onLearned, onError }) => {
  const [isLearnMode, setIsLearnMode] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const latest = useRef({});
  latest.current = { hub3DeviceId, remoteUuid, api, onLearned, onError };
  // 已订阅的 Hub（同一个 Hub 只订阅一次）
  const subscribedHub = useRef('');
  // 进入过学习模式（自己点的「+」，或 Hub 报告正处于学习模式）：离开页面时才需要恢复为控制模式
  const touchedLearn = useRef(false);

  const setMode = useCallback((mode) => {
    const { api: a, hub3DeviceId: hub } = latest.current;
    if (!hub) return;
    a.setIRMode(hub, mode, (response) => {
      if (!response.success) {
        console.error('set IR mode error:', response.message);
        latest.current.onError?.('pages.ir.remote.setIRModeFail');
      }
    });
  }, []);

  const exitLearnMode = useCallback(() => setMode(IR_MODE.CONTROL), [setMode]);

  const applyMode = (mode) => {
    if (mode === IR_MODE.LEARN) touchedLearn.current = true;
    setIsLearnMode(mode === IR_MODE.LEARN);
  };

  // 订阅学习模式、学习数据，并取一次当前模式
  const subscribe = useCallback(() => {
    const { api: a, hub3DeviceId: hub } = latest.current;
    if (!hub || subscribedHub.current === hub) return;
    subscribedHub.current = hub;

    a.subscribeIRMode(hub, (response) => {
      if (response.success) {
        try {
          applyMode(response.data.data.ir_mode);
        } catch (error) {
          console.error('parse IR mode data failed:', error);
        }
      } else {
        console.error('subscribe IR mode failed:', response.message);
        setIsConnected(false);
      }
    });

    a.subscribeIRData(hub, (response) => {
      if (!response.success) {
        console.error('subscribe learn data failed:', response.message);
        setIsConnected(false);
        exitLearnMode();
        return;
      }
      const { remoteUuid: uuid, api: cur } = latest.current;
      const keyUUID = biz3utils.generateUUID();
      const irCode = { keyUUID, name: '', uuid, deviceId: hub, data: response.data.data };
      // 先保存到服务器，成功后再加到本地
      cur.addIRCode(irCode, (addResponse) => {
        if (addResponse.success) {
          latest.current.onLearned?.({ uuid, keyUUID, kind: 'learned', keyName: '', name: '', timestamp: Date.now() });
        } else {
          console.error('add IR code failed:', addResponse.message);
          latest.current.onError?.('pages.ir.remote.addIRCodeFail');
        }
        exitLearnMode();
      });
    });

    a.getIRMode(hub, (response) => {
      if (!response.success) return;
      let mode;
      if (response.data && typeof response.data === 'object') {
        mode = response.data.ir_mode || response.data.mode;
      } else if (typeof response.data === 'number') {
        mode = response.data;
      }
      if (mode !== undefined) applyMode(mode);
    });
  }, [exitLearnMode]);

  const enterLearnMode = useCallback(() => {
    subscribe();
    touchedLearn.current = true;
    setMode(IR_MODE.LEARN);
  }, [subscribe, setMode]);

  const toggleLearnMode = useCallback(() => {
    if (isLearnMode) exitLearnMode();
    else enterLearnMode();
  }, [isLearnMode, enterLearnMode, exitLearnMode]);

  useEffect(() => {
    if (!enabled || !hub3DeviceId) return undefined;
    if (!lazy) subscribe();
    // 离开页面（或不再允许学习）时，进入过学习模式就恢复为控制模式
    return () => {
      if (touchedLearn.current) {
        touchedLearn.current = false;
        setMode(IR_MODE.CONTROL);
      }
    };
  }, [enabled, hub3DeviceId, lazy, subscribe, setMode]);

  return { isLearnMode, isConnected, toggleLearnMode, enterLearnMode, exitLearnMode };
};
