import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { Buffer } from 'buffer';
import { Card, TextField, Typography } from '@mui/material';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import CfpheaderCards from '@/components/biz/CfpHeaderCards';
import DataTable from '@/components/biz/device/DataTable';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import { CfpMsg } from '@/components/biz/device/CfpMsg';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { gConfig } from '@constants/gConfig';
import { useLocation } from 'react-router-dom';
import useOperateIoT from '@hooks/useOperateIoT';
import { registerIotCallback, unregisterIotCallback } from '@hooks/useIotCallbackRegistry';
import { biz3utils } from '@/utils/biz3utils';
import { Grid } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import usePasscodeUploader from '@/hooks/TouchProDataBufferUploader/usePasscodeUploader';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import { sesameTouchProAuthType } from '@constants/sesameTouchProAuthType';
import { gUtils } from '@/utils/gUtils';

export default function Passwords() {
  const cfpheaderCardsRef = useRef(null);
  const floatingAddRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { state = {} } = location;
  const { gManageAuthData, gManageDevice, setModalTitle, setCustomModalOpen, setModalContent, gMediaType } =
    useContext(GlobalStateContext);

  const ref = useRef(null);
  const [tableData, setTableData] = useState([]);
  const { title } = state || '';
  const [recentAddedPasswords, setRecentAddedPasswords] = useState([]);
  const { sendCmd } = useOperateIoT();
  const { uploadPasswordBatch, uploadState } = usePasscodeUploader(sendCmd);
  const [manualAdd, setManualAdd] = useState({ passwordID: '', name: '', loading: false });
  const [shouldCheckSync, setShouldCheckSync] = useState(false);

  const isManualAddReady = useMemo(() => {
    return manualAdd.passwordID && manualAdd.name;
  }, [manualAdd]);

  useEffect(() => {
    gManageAuthData.fetchPasscodes();
  }, [gManageAuthData.nfcCards]);

  useEffect(() => {
    if (state.uuid) {
      setTableData(passwords);
    }
  }, [gManageAuthData.passcodes]);

  const passwords = useMemo(() => {
    return gManageAuthData.passcodes
      .filter((item) => item.deviceID === state.uuid)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [gManageAuthData.passcodes, state.uuid]);

  useEffect(() => {
    if (!gManageAuthData.passcodeFetchState.done) {
      return;
    }
    setShouldCheckSync(true);
  }, [gManageAuthData.passcodeFetchState.done]);

  useEffect(() => {
    if (!shouldCheckSync) {
      return;
    }
    const device = gManageDevice.filteredAccessControlDevices.find((item) => item.deviceUUID === state.uuid);
    if (device && device.stateInfo?.keyboards_num !== passwords.length) {
      refreshPasswords();
    }
    setShouldCheckSync(false);
  }, [shouldCheckSync, gManageDevice.filteredAccessControlDevices, passwords]);

  const showError = async () => {
    setModalTitle('');
    setModalContent(
      <CfpMsg
        msg={'有効なパスワード名およびコードを入力してください。いずれも空欄では登録できません。'}
        onClick={() => {
          setCustomModalOpen(false);
        }}
      />
    );
    setCustomModalOpen(true);
  };

  const passwordModeSetCallback = async (deviceUUID, data) => {
    console.log('passwordModeSetCallback', deviceUUID, data, data.op, data.status);
    if (data.op === gConfig.cmdCode.SSM_OS3_PASSCODE_MODE_SET && data.stpUUID === state.uuid) {
      console.log(`設備 ${deviceUUID} パスワードモード設定成功`);
      cfpheaderCardsRef.current?.setReadCardContent(data.status);
    }
  };

  registerIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_MODE_SET, passwordModeSetCallback);

  const sendDataToSesameTouchPro = async (list) => {
    console.log('[passwords][sendDataToSesameTouchPro] list:', list);
    // 入力検証
    if (!Array.isArray(list) || list.length === 0) {
      console.warn('[passwords][sendDataToSesameTouchPro] Invalid input: list must be a non-empty array');
      return;
    }
    const uploadedData = await uploadPasswordBatch({
      deviceUUID: state.uuid,
      list,
    });
    gManageAuthData.postPasscodes({
      deviceUUID: uploadedData.deviceUUID,
      list: uploadedData.list,
      cb: (res) => console.log('Passwords saved to database', res),
    });
    floatingAddRef.current?.handleClose();
  };

  const processedPasswordOperations = new Set();
  const passwordChangeCallback = async (deviceUUID, data) => {
    console.log('passwordChangeCallback', deviceUUID, data);
    if (!data || typeof data !== 'object' || !data.p) {
      return;
    }
    const { passwordID } = biz3utils.parseHexStrToPasscodeInfo(data.p);
    const operationId = `${passwordID}`;
    if (processedPasswordOperations.has(operationId)) {
      console.log(`操作 ${operationId} 已处理，跳过`);
      return;
    }
    processedPasswordOperations.add(operationId);
    setRecentAddedPasswords((prevState) => {
      if (prevState.includes(passwordID)) {
        return prevState;
      } else {
        return [...prevState, passwordID];
      }
    });
  };

  const recentlyAddedPasswords = useMemo(() => {
    if (recentAddedPasswords.length < 1) {
      return [];
    }
    return tableData.filter((item) => recentAddedPasswords.includes(item.passwordID));
  }, [recentAddedPasswords, tableData]);

  const refreshPasswords = () => {
    if (wifiStateTrue) {
      gManageAuthData.clearPasswords(state.uuid, (_res) => {
        gManageAuthData.getAllPasscodes(state.uuid);
      });
    }
  };

  const wifiStateTrue = useMemo(() => {
    const device = gManageDevice.filteredAccessControlDevices.find((item) => item.deviceUUID === state.uuid);
    return Boolean(device?.stateInfo?.wm2State);
  }, [state.uuid, gManageDevice.filteredAccessControlDevices]);

  const manualAddPasscode = async () => {
    const payload = biz3utils.buildPayloadPasscodeAdd({ password: biz3utils.formatPasscodeID(manualAdd.passwordID) });
    let base64 = Buffer.from(payload).toString('base64');
    let cmd = {
      topic: `stp${state.uuid}cmd`,
      payload: base64,
      op: gConfig.cmdCode.SSM_OS3_PASSCODE_ADD,
    };
    await sendCmd(cmd);
    setManualAdd((preState) => {
      return {
        ...preState,
        loading: true,
      };
    });
    registerIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_CHANGE, async (deviceUUID, data) => {
      const passcodeInfo = biz3utils.parseHexStrToPasscodeInfo(data.p);
      updatePasscodeItem({ ...passcodeInfo, name: manualAdd.name }, (_resp) => {
        setManualAdd({
          passwordID: '',
          name: '',
          loading: false,
        });
      });
      unregisterIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_CHANGE);
      floatingAddRef.current?.handleClose();
    });
  };

  const updatePasscodeItem = (passcodeInfo, cb) => {
    const param = {
      keyBoardPassCode: passcodeInfo.passwordID,
      name: passcodeInfo.name || '',
      keyBoardPassCodeNameUUID: passcodeInfo.nameUUID || '',
      timestamp: new Date().getTime(),
      type: passcodeInfo.passwordType || '',
      stpDeviceUUID: state.uuid,
    };
    gManageAuthData.updatePasswordName(param, (resp) => {
      cb && cb(resp);
    });
  };

  const handleCarSetInputMode = async (isChoose) => {
    await sendCmd(
      biz3utils.buildPayloadModeSet({ uuid: state.uuid, type: sesameTouchProAuthType.password, insertOn: isChoose })
    );
    setRecentAddedPasswords([]);
    processedPasswordOperations.clear();
    if (isChoose) {
      registerIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_CHANGE, passwordChangeCallback);
    } else {
      unregisterIotCallback(gConfig.cmdCode.SSM_OS3_PASSCODE_CHANGE);
    }
  };

  const addPasswordComponent = useMemo(
    () => (
      <>
        <CfpheaderCards
          ref={cfpheaderCardsRef}
          isShowCsv={!gMediaType.isMobile}
          style={{ marginTop: '0px' }}
          csvLoading={uploadState !== 'Idle'}
          csvData={async (data) => {
            console.log('csv添加数据', data);
            setCustomModalOpen(false);
            if (gManageDevice.getWifiState(state.uuid)) {
              let list = [];
              let isPasswordExist = true;
              data.forEach((item) => {
                let it = {};
                const pwdValue = item.暗証番号;
                if (pwdValue && /^\d+$/.test(pwdValue)) {
                  it.passwordID = biz3utils.formatPasscodeID(item.暗証番号 || item.passwordID);
                  it.nameUUID = String(item.暗証番号名 || item.nameUUID || '');
                  list.push(it);
                } else {
                  isPasswordExist = false;
                }
              });
              if (isPasswordExist === true) {
                await sendDataToSesameTouchPro(list);
              } else {
                console.log('当前数据', 'erro');
                showError();
              }
            }
          }}
          data={gUtils.authText.fontCfpPw}
          goSet={async (isChoose) => {
            handleCarSetInputMode(isChoose);
          }}
          isBindMm={false}
          tagTitle={'暗証番号名'}
          id={'passwordID'}
          mdatas={recentlyAddedPasswords}
          addCard={(d) => {
            updatePasscodeItem(d, (_res) => {
              setRecentAddedPasswords((prevState) => prevState.filter((password) => password !== d.passwordID));
            });
          }}
        />
        <Card sx={{ px: 3.5, pb: 0 }}>
          <Typography variant="h3">暗証番号を手入力</Typography>
          <Grid container spacing={1} sx={{ pt: 0, mt: 1, lineHeight: 3 }}>
            <Grid item xs={4}>
              <TextField
                size="small"
                label="暗証番号"
                variant="filled"
                fullWidth
                required
                value={manualAdd.passwordID}
                onChange={(e) => {
                  setManualAdd((preState) => {
                    return {
                      ...preState,
                      passwordID: e.target.value.trim().replace(/\D/g, ''),
                    };
                  });
                }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                size="small"
                label="暗証番号名"
                variant="filled"
                fullWidth
                required
                value={manualAdd.name}
                onChange={(e) => {
                  setManualAdd((preState) => {
                    return {
                      ...preState,
                      name: e.target.value.trim(),
                    };
                  });
                }}
              />
            </Grid>
            <Grid item xs={3}>
              <LoadingButton
                sx={{ minWidth: '64px', height: '40px' }}
                loading={manualAdd.loading}
                variant="outlined"
                size="small"
                disabled={!isManualAddReady}
                onClick={(e) => {
                  e.preventDefault();
                  manualAddPasscode();
                }}
              >
                登録
              </LoadingButton>
            </Grid>
          </Grid>
        </Card>
      </>
    ),
    [
      gMediaType.isMobile,
      uploadState,
      state.uuid,
      gUtils.authText.fontCfpPw,
      recentlyAddedPasswords,
      manualAdd.passwordID,
      manualAdd.name,
      manualAdd.loading,
      isManualAddReady,
    ]
  );

  return (
    <SesameFloatingAdd
      ref={floatingAddRef}
      isMobile={gMediaType.isMobile}
      popupComponent={addPasswordComponent}
      onClose={() => {
        handleCarSetInputMode(false);
      }}
    >
      <DataTable
        isMobile={gMediaType.isMobile}
        isAdd={false}
        data={tableData}
        isBind={false}
        isBack={true}
        text={title}
        columns={DataTableColumns.passwordColumns({
          ref: ref,
          listDevices: gManageDevice.filteredAccessControlDevices,
        })}
        callAdd={() => {
          floatingAddRef.current.handleOpen();
        }}
        callRowClick={(index) => {
          navigate({
            pathname: '/biz/access-control/password-details',
            search: createSearchParams({ did: tableData[index].passwordID, uuid: state.uuid }).toString(),
          });
        }}
        callDelData={(items) => {
          console.log('删除数据', items);
          wifiStateTrue && gManageAuthData.sendDelPasswordsCmd(state.uuid, items);
        }}
        callSearch={(e) => {
          if (!e) {
            setTableData(passwords);
          } else {
            const reuslt = passwords.filter((item) => {
              const findPassword = biz3utils.convertHexPairsToDecimal(item.passwordID)?.includes(e);
              const findPasswordName = item.name?.includes(e);
              return findPasswordName || findPassword;
            });
            setTableData(reuslt);
          }
        }}
        callRefresh={
          wifiStateTrue
            ? (_e) => {
                refreshPasswords();
              }
            : null
        }
      />
    </SesameFloatingAdd>
  );
}
