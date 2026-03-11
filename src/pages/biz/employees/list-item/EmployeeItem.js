import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardContent, IconButton, Box } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { gUtils } from '@/utils/gUtils';
import EditableText from '@/components/EditableText';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import DataTable from '@/components/biz/device/DataTable';
import DeleteMenuButton from '@/components/biz/DeleteMenuButton';
import CheckTable from '@/components/biz/CheckTable';
import KeyLevelSelector from '@/components/biz/KeyLevelSelector';
import MobileUserDevices from '@/components/MobileUserDevices';
import { biz3utils } from '@utils/biz3utils';
import UserBasicInfo from '@/components/biz/device/UserBasicInfo';

const EmployeeItem = () => {
  const {
    gManageEmployee,
    gStripe,
    gManageGroup,
    gManageDevice,
    gManageAuthData,
    gMediaType,
    setCustomModalOpen,
    setModalContent,
  } = useContext(GlobalStateContext);
  const [rawEmployeeKeys, setRawEmployeeKeys] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = useRef(null);
  const uid = searchParams.get('uid') || '';
  const employeeEmail = searchParams.get('email') || '';
  const [data, setData] = useState({});
  const FriendChangedName = 'FriendChanged';

  useEffect(() => {
    const user = gManageEmployee.findEmployeeById(uid);
    if (user) {
      setData(user);
    }
  }, [gManageEmployee.employees]);

  const employeeKeys = useMemo(() => {
    const myUUID = gStripe.customerInfo.subUUID;
    if (!myUUID || gManageDevice.companyDevices.length < 1 || rawEmployeeKeys.length < 1) {
      return [];
    }
    const isMe = uid === gStripe.customerInfo.subUUID;
    return rawEmployeeKeys
      .map((item) => {
        if (isMe) {
          return { ...item };
        }
        const matchingDevice = gManageDevice.companyDevices.find((i) => i.deviceUUID === item.deviceUUID);
        if (matchingDevice) {
          return {
            ...item,
            deviceName: matchingDevice.deviceName,
            curLevel: matchingDevice.keyLevel,
          };
        } else {
          return { ...item, deviceName: undefined, msgData: data };
        }
      })
      .filter((item) => {
        return item.deviceName !== undefined;
      });
  }, [gManageDevice.companyDevices, rawEmployeeKeys, gStripe.customerInfo]);

  const fetchEmployeeDeviceKeys = () => {
    gManageGroup.getEmployeeDeviceKeys(uid, (res) => {
      if (res.success) {
        let nresult = res.data.map((item) => {
          let data = '常時利用';
          if (item.endAt && item.startAt) {
            item.startTime = item.startAt;
            item.endTime = item.endAt;
            data = gUtils.getStartTimeEndTime(item);
          }
          return { ...item, msgData: data };
        });
        setRawEmployeeKeys(nresult);
      }
    });
  };

  useEffect(() => {
    if (gStripe.isFromApp) {
      gManageDevice.getCompanyDevices(true);
    }
    fetchEmployeeDeviceKeys();
  }, [gStripe.customerInfo.companyID]);

  const employeeCards = useMemo(() => {
    const uniqueCards = [];
    const cardIDSet = new Set();
    gManageAuthData.nfcCards.forEach((item) => {
      if (!cardIDSet.has(item.cardID)) {
        cardIDSet.add(item.cardID);
        uniqueCards.push(item);
      }
    });
    return uniqueCards.filter((item) => item.subUUID === uid);
  }, [gManageAuthData.nfcCards]);

  const canSelectedDevices = useMemo(() => {
    if (employeeKeys.length < 1) {
      return gManageDevice.companyDevices.filter((it) => !gUtils.isDeviceKeyGuest(it.keyLevel));
    }
    return gManageDevice.companyDevices.filter((it) => {
      if (gUtils.isDeviceKeyGuest(it.keyLevel)) {
        return false;
      }
      return !employeeKeys.some((exit) => exit?.deviceUUID === it.deviceUUID);
    });
  }, [employeeKeys, gManageDevice.companyDevices]);

  const chooseKeyLevel = (items) => {
    setModalContent(
      <KeyLevelSelector
        showButton
        showOwnerOption={items[0].keyLevel === 0}
        onConfirm={(keyLevel, cb) => {
          const allItems = items.flatMap((device) => {
            delete device['stateInfo'];
            return {
              ...device,
              rank: 0,
              keyLevel,
              subUUID: uid,
            };
          });
          gManageGroup.shareDeviceKeysToEmployees(allItems, (res) => {
            setCustomModalOpen(false);
            res.success && fetchEmployeeDeviceKeys();
            cb && cb();
          });
        }}
        onCancel={() => {
          setCustomModalOpen(false);
        }}
      />
    );
  };

  const onAddButtonClickHandler = () => {
    setCustomModalOpen(true);
    setModalContent(
      <CheckTable
        title={'デバイスを選択'}
        data={canSelectedDevices}
        selectableRows={'single'}
        enableFilter={!gStripe.isFromApp}
        useCustomSelection={true}
        setOpenModal={setCustomModalOpen}
        handleCheck={chooseKeyLevel}
        isMobile={gStripe.isFromApp}
      />
    );
  };

  return (
    <>
      <Card>
        <Box>
          <CardHeader
            title={
              gStripe.isFromApp ? null : (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton sx={{ p: 0 }} size="small" onClick={() => navigate(-1)}>
                    <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
                  </IconButton>
                  <EditableText
                    style={{
                      fontSize: '1.2em',
                      fontWeight: 'bold',
                      lineHeight: '1.3',
                    }}
                    initialValue={data.employeeName}
                    onSave={null}
                  />
                  {uid !== gStripe.customerInfo.subUUID && !gStripe.customerInfo.isSesameApp && (
                    <DeleteMenuButton
                      onDelete={() => {
                        const user = gManageEmployee.findEmployeeById(uid);
                        gManageEmployee.removeEmployees([user], (res) => {
                          if (res.success) {
                            navigate(-1);
                          }
                        });
                      }}
                    />
                  )}
                </Box>
              )
            }
          />
          <CardContent>
            <UserBasicInfo
              data={data}
              employeeEmail={employeeEmail}
              isSesameApp={gStripe.customerInfo.isSesameApp}
              onSave={(params, callback) => {
                gManageEmployee.postEmployeeInfo(params, (res) => {
                  callback(res.success);
                });
              }}
            />
          </CardContent>
        </Box>
      </Card>
      <MobileUserDevices
        onAddButtonClickHandler={onAddButtonClickHandler}
        deviceKeys={employeeKeys}
        onRemoveUser={
          gStripe.customerInfo.isSesameApp
            ? (cb) => {
                gManageEmployee.removeEmployees(
                  [
                    {
                      subUUID: uid,
                      companyID: gStripe.customerInfo.companyID,
                    },
                  ],
                  (res) => {
                    if (res.success) {
                      cb && cb();
                      if (gStripe.isFromApp) {
                        // 在 App 端内调用通知
                        const scheme = `ssm://UI/webview/notify?${new URLSearchParams({
                          notifyName: FriendChangedName,
                        })}`;
                        biz3utils.triggerScheme(scheme);
                      } else {
                        // 不在 App 端内退回上一页
                        navigate(-1);
                      }
                    }
                  }
                );
              }
            : null
        }
        onDelete={(deviceUUID) => {
          const deviceItem = employeeKeys.find((it) => it.deviceUUID === deviceUUID);
          const data = {
            subUUID: deviceItem.subUUID,
            deviceUUID: deviceItem.deviceUUID,
          };
          gManageGroup.removeEmployeeDeviceKey(data, (res) => {
            res.success && fetchEmployeeDeviceKeys();
          });
        }}
      />
      {!gStripe.customerInfo.isSesameApp && employeeCards.length > 0 && (
        <DataTable
          isMobile={gMediaType.isMobile}
          isShowFooter={false}
          isAdd={false}
          data={employeeCards}
          selectableRows={'none'}
          isCsv={false}
          isBind={false}
          isDel={false}
          text={`カード一覽`}
          columns={DataTableColumns.deviceItemCards({ gManageDevice, ref })}
        />
      )}
    </>
  );
};

export default EmployeeItem;
