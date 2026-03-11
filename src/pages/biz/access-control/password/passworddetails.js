import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Box, Card, CardHeader, IconButton, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CheckTable from '@/components/biz/CheckTable';
import { wordConfig } from '@constants/wordConfig';
import { useTranslation } from 'react-i18next';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { biz3utils } from '@/utils/biz3utils';
import useOperateIoT from '@hooks/useOperateIoT';
import CardInfoDisplay from '@/components/biz/device/CardDeviceInfo';
import EditableText from '@/components/EditableText';
import { gConfig } from '@constants/gConfig';
import { Buffer } from 'buffer';
import { registerIotCallback, unregisterIotCallback } from '@hooks/useIotCallbackRegistry';
import { gUtils } from '@/utils/gUtils';

export default function PasswordDetails() {
  const { t } = useTranslation(); // i18n
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const did = searchParams.get('did') || '';
  const uuid = searchParams.get('uuid') || '';
  const { gManageDevice, setCustomModalOpen, setModalContent, gManageAuthData, setSnackbarValue, gMediaType } =
    useContext(GlobalStateContext);
  const pendingDevicesRef = useRef({ deviceIDs: [], cb: null });
  const { sendCmd } = useOperateIoT();

  const passcodes = useMemo(() => {
    return gManageAuthData.findPasscodesByPasscodeID(did).sort((a, b) => a.timestamp - b.timestamp);
  }, [gManageAuthData.passcodes, did]);

  const passcodeDetail = useMemo(() => {
    return {
      [wordConfig.touchCertEquipment]: passcodes.map((it) => {
        return {
          title: gManageDevice.findTouchName(it.deviceID),
          value: it.name,
          rawData: it,
        };
      }),
    };
  }, [passcodes]);

  const handleOpenModal = () => {
    let value = gManageDevice.filteredAccessControlDevices.filter(
      (item) => gUtils.canPasswordControl(item.deviceModel) && !passcodes[0].uuids.some((it) => it === item.deviceUUID)
    );
    setModalContent(
      <CheckTable
        loadingAble
        title={t('pages.sesameAccessControlDevice.index.SelectAuthenticationDevice')}
        setOpenModal={setCustomModalOpen}
        selectableRows={'multiple'}
        handleClose={() => setCustomModalOpen(false)}
        data={value}
        handleCheck={handleCheck}
        isWifi={true}
      />
    );
    setCustomModalOpen(true);
  };

  const handleCheck = async (items, cb) => {
    console.log('items', items);
    pendingDevicesRef.current = {
      deviceIDs: items.map((it) => it.deviceUUID),
      cb: cb,
    };
    const { passwordID, name } = passcodes[0];
    const payload = biz3utils.buildPayloadPasscodeAdd({ password: passwordID });
    for (const item of items) {
      await new Promise((resolve) => {
        registerIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_CHANGE, async (deviceUUID, data) => {
          if (deviceUUID !== item.deviceUUID) return;
          unregisterIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_CHANGE);
          const passcodeInfo = biz3utils.parseHexStrToPasscodeInfo(data.p);
          updatePasscodeItem({ ...passcodeInfo, name }, (_resp) => {
            resolve();
          });
        });
        sendCmd({
          topic: `stp${item.deviceUUID}cmd`,
          payload: Buffer.from(payload).toString('base64'),
          op: gConfig.cmdCode.SSM_OS3_PASSCODE_ADD,
        });
      });
    }
    cb && cb();
    setCustomModalOpen(false);
  };

  const sendPasscodeDeleteToSesameTouchPro = async (passcode) => {
    let passcodeID = biz3utils.hexStringToUint8Array(passcode.passwordID);
    let payloadSize = 1 + passcodeID.length;
    let payloadU8A = new Uint8Array(payloadSize);
    payloadU8A[0] = gConfig.cmdCode.SSM_OS3_PASSCODE_DELETE;
    payloadU8A.set(passcodeID, 1);
    let payload = Buffer.from(payloadU8A).toString('base64');
    let cmd = {
      topic: `stp${passcode.deviceID}cmd`,
      payload,
      op: gConfig.cmdCode.SSM_OS3_PASSCODE_DELETE,
    };
    await sendCmd(cmd);
  };

  const sendPasscodeValueChangeToSesameTouchPro = useCallback(
    async (newPasscode, passwordItem) => {
      // code + old + new
      const newPasscodeIDBuff = biz3utils.hexStringToUint8Array(biz3utils.formatPasscodeID(newPasscode));
      const oldPasscodeIDBuff = biz3utils.hexStringToUint8Array(did);
      let payloadSize = 1 + 1 + oldPasscodeIDBuff.length + newPasscodeIDBuff.length;
      let payloadU8A = new Uint8Array(payloadSize);
      payloadU8A[0] = gConfig.cmdCode.STP_ITEM_CODE_PASSCODE_CHANGE_VALUE;
      payloadU8A[1] = oldPasscodeIDBuff.length;
      payloadU8A.set(oldPasscodeIDBuff, 2);
      payloadU8A.set(newPasscodeIDBuff, oldPasscodeIDBuff.length + 2);
      console.log('will send payload', payloadU8A);
      await sendCmd({
        topic: `stp${passwordItem.deviceID}cmd`,
        payload: Buffer.from(payloadU8A).toString('base64'),
        op: gConfig.cmdCode.STP_ITEM_CODE_PASSCODE_CHANGE_VALUE,
      });
    },
    [did]
  );

  const sendChangeCodeToSesameTouchPros = async (newVal, cb) => {
    const devicePasscodes = [...passcodes];
    for (const item of devicePasscodes) {
      try {
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log('超时触发', JSON.stringify(item));
            unregisterIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_CHANGE);
            resolve();
          }, 10000);
          registerIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_CHANGE, async (deviceUUID, _data) => {
            if (deviceUUID !== item.deviceID) return;
            clearTimeout(timeout);
            unregisterIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_CHANGE);
            resolve();
          });
          sendPasscodeValueChangeToSesameTouchPro(newVal, item);
        });
        console.log(`设备 ${item.deviceUUID} 的密码已成功更新`);
      } catch (error) {
        console.error(`设备 ${item.deviceUUID} 更新密码失败:`, error);
      }
    }
    // 开始刷新页面
    refreshPasswords(devicePasscodes, () => {
      cb && cb(true);
      handleChangeDid(biz3utils.formatPasscodeID(newVal));
    });
  };

  const handleChangeDid = (newDid) => {
    const url = new URL(window.location.href);
    url.searchParams.set('did', newDid);
    navigate(url.pathname + url.search, { replace: true });
  };

  const refreshPasswords = async (devicePasscodes, cb) => {
    for (const item of devicePasscodes) {
      const device = gManageDevice.filteredAccessControlDevices.find((it) => it.deviceUUID === item.deviceID);
      if (!Boolean(device?.stateInfo?.wm2State)) {
        return;
      }
      gManageAuthData.clearPasswords(item.deviceID, (_res) => {
        gManageAuthData.getAllPasscodes(item.deviceID);
      });
      // [eddy todo] 将来以 服务端 SQS 队列
      await new Promise((resolve) => setTimeout(resolve, 6000));
    }
    cb && cb();
  };

  const updatePasscodeItem = (passcodeInfo, cb) => {
    const param = {
      keyBoardPassCode: passcodeInfo.passwordID,
      name: passcodeInfo.name || '',
      keyBoardPassCodeNameUUID: passcodeInfo.nameUUID || '',
      timestamp: new Date().getTime(),
      type: passcodeInfo.passwordType || '',
      stpDeviceUUID: uuid,
    };
    gManageAuthData.updatePasswordName(param, (resp) => {
      cb && cb(resp);
    });
  };

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => navigate(-1)}>
                <KeyboardArrowLeftIcon sx={{ ml: -2 }} />
              </IconButton>
              <Typography variant="h3">{t('pages.login.ReturnToMailInput')}</Typography>
            </Box>
          }
        />
      </Card>
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', pl: '25px', mt: '0px' }}>
        <Typography sx={{ fontWeight: 'bold', color: '#333', mr: 6 }}>{wordConfig.touchPinNumber}</Typography>
        <EditableText
          initialValue={biz3utils.convertHexPairsToDecimal(did)}
          onSave={(newValue, callback) => {
            const val = newValue.trim().replace(/\D/g, '');
            sendChangeCodeToSesameTouchPros(val, callback);
          }}
        />
      </Box>
      <CardInfoDisplay
        isMobile={gMediaType.isMobile}
        style={{ mt: 0, pl: '25px' }}
        data={passcodeDetail}
        onEdit={(label, newValue, index, callback) => {
          if (label === wordConfig.touchPinNumber) {
            return;
          }
          const cardItem = passcodes[index] || {};
          const param = {
            keyBoardPassCode: cardItem.passwordID,
            name: newValue,
            keyBoardPassCodeNameUUID: cardItem.nameUUID || '',
            timestamp: new Date().getTime(),
            type: cardItem.passwordType || '',
            stpDeviceUUID: cardItem.deviceID,
          };
          gManageAuthData.updatePasswordName(param, (resp) => {
            if (resp.errMsg) {
              setSnackbarValue({
                open: true,
                msg: resp.errMsg,
              });
              callback(false);
            } else {
              callback(true);
            }
          });
        }}
        onDelete={(label, index) => {
          sendPasscodeDeleteToSesameTouchPro(passcodes[index]);
        }}
        onAdd={handleOpenModal}
      />
    </>
  );
}
