import React, { useContext, useState, useMemo, useCallback } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { gUtils } from '@/utils/gUtils';
import CheckTable from './biz/CheckTable';
import { DataTableColumns } from './biz/device/DataTableColumns';
import { Cmac } from '@/utils/Cmac';
import KeyLevelSelector from './biz/KeyLevelSelector';
import MobileDeviceUsers from './MobileDeviceUsers';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ModifyName from './ModifyName';
import MobileQRCodeDialog from './MobileQRCodeDialog';
import { biz3utils } from '@/utils/biz3utils';
import BlurOverlay from './BlurOverlay';

export default function DeviceUserList({ deviceUUID: propDeviceUUID, defaultManageMode = false }) {
  const { gManageGroup, gStripe, gMediaType, setCustomModalOpen, setModalContent, gManageEmployee, gManageDevice } =
    useContext(GlobalStateContext);
  const [users, setUsers] = useState([]);
  const [searchParams] = useSearchParams();
  const searchDeviceUUID = searchParams.get('deviceUUID');
  const deviceUUID = propDeviceUUID || searchDeviceUUID;
  const keyLevel = searchParams.get('keyLevel');
  const { t } = useTranslation();
  const [qrDialog, setQrDialog] = useState({ open: false, url: '', user: null });
  const [hasMore, setHasMore] = useState(false);

  const getDeviceUser = (deviceUUID, limit) => {
    gManageGroup.getDeviceEmployeeKeys({ deviceUUID, limit }, (resp) => {
      setHasMore(resp.hasMore);
      let userList = resp.data.map((item) => {
        let data = '常時利用';
        if (item.keyLevel === 2) {
          if (item.startAt && item.endAt) {
            data = gUtils.getStartTimeEndTime(item);
          }
        } else {
          data = '';
        }
        return { ...item, msgdata: data };
      });
      const currentUserIndex = userList.findIndex((user) => user.subUUID === gStripe.customerInfo.subUUID);
      if (currentUserIndex > -1) {
        const [currentUser] = userList.splice(currentUserIndex, 1);
        userList.unshift(currentUser);
      }
      setUsers(userList);
    });
  };

  const currentDevice = useMemo(() => {
    return (
      gManageDevice.companyDevices.find((device) => device.deviceUUID === deviceUUID) || gManageDevice.deviceStatus
    );
  }, [deviceUUID, gManageDevice.companyDevices, gManageDevice.deviceStatus]);

  const fetchCanSelectUsers = (isManageMode) => {
    if (isManageMode) {
      gManageEmployee.getEmployees();
      gManageDevice.getDeviceStatus(deviceUUID);
    }
    getDeviceUser(deviceUUID, isManageMode ? 0 : 5);
  };

  const canSelectedUser = useMemo(() => {
    if (users.length < 1) {
      return gManageEmployee.employees.Items;
    }
    return gManageEmployee.employees.Items.filter((it) => !users.some((exit) => exit.subUUID === it.subUUID));
  }, [gManageEmployee.employees.Items, users]);

  const chooseKeyLevel = (items) => {
    setModalContent(
      <KeyLevelSelector
        showButton
        showOwnerOption={users.find((it) => it.subUUID === gStripe.customerInfo.subUUID)?.keyLevel === 0}
        onConfirm={(keyLevel, cb) => {
          const device = currentDevice;
          const param = { ...device };
          delete param['stateInfo'];
          const allItems = items.flatMap((user) => {
            return {
              ...param,
              rank: 0,
              ...user,
              keyLevel,
            };
          });
          gManageGroup.shareDeviceKeysToEmployees(allItems, (res) => {
            cb && cb();
            setCustomModalOpen(false);
            res.success && getDeviceUser(deviceUUID);
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
        title={'ユーザーを選択'}
        customColumns={DataTableColumns.groupMember}
        data={canSelectedUser}
        selectableRows={'multiple'}
        enableFilter={!gStripe.isFromApp}
        useCustomSelection={true}
        setOpenModal={setCustomModalOpen}
        handleCheck={chooseKeyLevel}
        isMobile={gStripe.isFromApp}
      />
    );
  };

  const onRemoveUser = async (user) => {
    let data = {};
    if (user.guestKeyId?.length > 0) {
      const device = currentDevice;
      const randomTag = await Cmac.cmacTime(device.secretKey);
      data = {
        guestKeyId: user.guestKeyId,
        randomTag,
        deviceUUID,
      };
    } else {
      data = {
        subUUID: user.subUUID,
        deviceUUID,
      };
    }
    gManageGroup.removeEmployeeDeviceKey(data, (res) => {
      res.success && getDeviceUser(deviceUUID);
    });
  };

  const onModifyGuestTag = async (selectedUser) => {
    setCustomModalOpen(true);
    setModalContent(
      <ModifyName
        title={t('pages.sesameAccessControlDevice.index.ModifyGuestKeyTag')}
        value={selectedUser.employeeName}
        onCancel={() => setCustomModalOpen(false)}
        onConfirm={(val, cb) => {
          gManageGroup.updateGuestKeyTag(
            {
              deviceUUID,
              guestKeyId: selectedUser.guestKeyId,
              keyName: val,
            },
            (res) => {
              if (res.success) {
                setUsers((preState) => {
                  return preState.map((user) =>
                    selectedUser.guestKeyId === user.guestKeyId ? { ...user, employeeName: val } : user
                  );
                });
              }
              cb && cb();
              setCustomModalOpen(false);
            }
          );
        }}
      />
    );
  };

  const onShareGuestQRCode = useCallback(
    (selectedUser, isSecure = true) => {
      gManageGroup.generateQRToken(
        {
          deviceUUID,
          keyLevel: selectedUser.keyLevel,
          guestKeyId: selectedUser.guestKeyId,
          name: selectedUser.employeeName,
          ...(!isSecure && { isSecure: false }),
        },
        (res) => {
          if (!res.success) {
            console.error('Failed to generate QR token');
            return;
          }
          biz3utils.writeQrcode(res.data?.qrToken, (ins) => {
            const url = ins.toDataURL(10, 0);
            setQrDialog({ open: true, url, user: selectedUser });
          });
        }
      );
    },
    [gManageGroup, deviceUUID]
  );

  const handleShareGuestQRCode = useCallback(
    (selectedUser) => {
      onShareGuestQRCode(selectedUser, true);
    },
    [onShareGuestQRCode]
  );

  const handleQRCodeSecureChange = useCallback(
    (event) => {
      const isSecure = event.target.checked;
      setQrDialog((preState) => ({ ...preState, url: '' }));
      if (qrDialog.user) {
        onShareGuestQRCode(qrDialog.user, isSecure);
      }
    },
    [onShareGuestQRCode, qrDialog.user]
  );

  const disableInteraction = useMemo(() => {
    return parseInt(keyLevel) === 2;
  }, [keyLevel]);

  return (
    <BlurOverlay enabled={disableInteraction}>
      <MobileDeviceUsers
        showType={!gUtils.isWifiModulePrefix(deviceUUID) ? 'widget' : ''}
        gStrip={gStripe}
        users={users}
        fetchUserAndDevices={fetchCanSelectUsers}
        onAddClickHandler={onAddButtonClickHandler}
        onRemoveUser={onRemoveUser}
        onModifyGuestTag={onModifyGuestTag}
        onShareGuestQRCode={handleShareGuestQRCode}
        gManageEmployee={gManageEmployee}
        defaultManageMode={defaultManageMode}
        hasMore={hasMore}
      />
      <MobileQRCodeDialog
        open={qrDialog.open}
        qrCodeUrl={qrDialog.url}
        isMobile={gMediaType.isMobile}
        title={`${currentDevice?.deviceName}${t('pages.sesameAccessControlDevice.index.AddDeviceKeyByScan')}`}
        subtitle={t('pages.sesameAccessControlDevice.index.AddDeviceKeyByScanHint')}
        userName={currentDevice?.deviceName}
        onEncryptChange={handleQRCodeSecureChange}
        onClose={() => {
          setQrDialog((preState) => ({ ...preState, open: false }));
          getDeviceUser(deviceUUID);
        }}
      />
    </BlurOverlay>
  );
}
