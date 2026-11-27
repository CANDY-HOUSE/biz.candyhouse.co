import { useTranslation } from 'react-i18next';
import BackButton from '@/components/BackButton';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { isAppHome } from '@/services/deviceService';
import UserBasicInfo from '@/components/biz/device/UserBasicInfo';
import { DetailPanelContext } from '@/components/detailPanelContext';
import SettingsGroup, { settingsPageSx } from '@/components/SettingsGroup';
import { ios } from '@/theme/appHomeStyle';

// UserBasicInfo draws bare label / value rows; in the card they get row padding and iOS text colors.
const infoCardSx = {
  '& .MuiListItem-root': { px: '16px', height: 'auto', minHeight: 52, gap: 2 },
  '& .MuiListItem-root > .MuiTypography-root:first-of-type': {
    flexShrink: 0,
    fontSize: 17,
    fontWeight: 400,
    color: ios.label,
  },
  '& .MuiListItem-root > .MuiTypography-root:last-of-type:not(:first-of-type)': {
    fontSize: 17,
    fontWeight: 400,
    color: ios.secondaryLabel,
    textAlign: 'right',
  },
};

const EmployeeItem = () => {
  const { t } = useTranslation();
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
  const panel = useContext(DetailPanelContext);
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
          let data = '';
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
          const allItems = items.flatMap(({ stateInfo: _stateInfo, ...device }) => {
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
        titleKey="contacts.selectDevices"
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

  const displayName = data.employeeName || data.employeeEmail || employeeEmail;

  return (
    <Box sx={{ ...settingsPageSx, minHeight: '100%' }}>
      {/* Contacts read the same in the APP and the browser; a company's member page keeps its title row. */}
      {gStripe.isFromApp || gStripe.customerInfo.isSesameApp ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: '16px', pt: '8px', pb: '24px' }}>
          {!gStripe.isFromApp && !panel && (
            <BackButton sx={{ alignSelf: 'flex-start', p: 0 }} size="small" onClick={() => navigate(-1)} />
          )}
          <Avatar
            sx={{
              width: 84,
              height: 84,
              fontSize: 34,
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(180deg, #A5ABB8 0%, #858994 100%)',
            }}
          >
            {displayName?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography
            sx={{
              mt: '12px',
              fontSize: 22,
              fontWeight: 700,
              color: ios.label,
              textAlign: 'center',
              wordBreak: 'break-all',
            }}
          >
            {data.employeeName}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', px: '20px', pb: '16px' }}>
          {!panel && <BackButton sx={{ p: 0 }} size="small" onClick={() => navigate(-1)}></BackButton>}
          <EditableText
            style={{
              fontSize: '22px',
              fontWeight: 700,
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
                    if (panel) panel.onRemoved(uid);
                    else navigate(-1);
                  }
                });
              }}
            />
          )}
        </Box>
      )}
      <SettingsGroup cardSx={infoCardSx}>
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
      </SettingsGroup>
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
                        // The former host closed this page on the notify; the web app leaves it itself.
                        if (isAppHome) window.dispatchEvent(new CustomEvent('app-back'));
                      } else {
                        // 不在 App 端内退回上一页
                        if (panel) panel.onRemoved(uid);
                        else navigate(-1);
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
        <Box sx={{ mx: '16px' }}>
          <DataTable
            isMobile={gMediaType.isMobile}
            isShowFooter={false}
            isAdd={false}
            data={employeeCards}
            selectableRows={'none'}
            isCsv={false}
            isBind={false}
            isDel={false}
            text={t('contacts.cardList')}
            columns={DataTableColumns.deviceItemCards({ gManageDevice, ref })}
          />
        </Box>
      )}
    </Box>
  );
};

export default EmployeeItem;
