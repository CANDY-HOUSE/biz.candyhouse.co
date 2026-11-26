import BackButton from '@/components/BackButton';
import { Box, Typography } from '@mui/material';
import { useContext, useState, useEffect, useMemo } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import CmChooseRadio from '@/components/biz/device/CmChooseRadio';
import { CmDataPicker } from '@/components/biz/device/CmDataPicker';
import DataTable from '@/components/biz/device/DataTable';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';
import { useTranslation } from 'react-i18next';

const GroupShare = () => {
  const { gManageGroup, gManageEmployee, gMediaType } = useContext(GlobalStateContext);
  const [isOpenGuestTime, setIsOpenGuestTime] = useState(false);
  const keyProp = 'id';
  const labelProp = 'name';
  const [btnState, setBtnState] = useState({ ready: false, loading: false });
  const [itemsGroupDevice, setItemsGroupDevice] = useState([]);
  const [itemsGroupMember, setItemsGroupMember] = useState([]);
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const itemsKeyPermissions = [
    { name: t('deviceMember.role.owner'), id: '0' },
    { name: t('deviceMember.role.manager'), id: '1' },
    { name: t('deviceMember.role.guest'), id: '2' },
  ];
  const itemsGuestTime = [
    { name: t('contacts.alwaysAvailable'), id: '0' },
    { name: t('manage.share.temporary'), id: '1' },
  ];
  const [valueGroupMember, setValueGroupMember] = useState('');
  const [valueKeyPermissions, setValueKeyPermissions] = useState('');
  const [valueGuestTime, setValueGuestTime] = useState();
  const [isShowTime, setIsShowTime] = useState(false);
  const [time, setTime] = useState({});
  const navigate = useNavigate();

  const callTime = (startTime, endTime) => {
    setTime({ startTime: Math.floor(startTime / 1000), endTime: Math.floor(endTime / 1000) });
  };

  const buttonState = useMemo(() => {
    const baseValidation = Boolean(itemsGroupDevice) && Boolean(valueGroupMember) && Boolean(valueKeyPermissions);
    const isGuestPermission = valueKeyPermissions === '2';
    const showTimeControl = isGuestPermission && valueGuestTime === '1';
    let isBtnEnabled = baseValidation;
    if (isGuestPermission) {
      isBtnEnabled = isBtnEnabled && Boolean(valueGuestTime);
    }
    return {
      isOpenGuestTime: isGuestPermission,
      isShowTime: showTimeControl,
      btnEnabled: isBtnEnabled,
    };
  }, [valueGroupMember, valueKeyPermissions, valueGuestTime]);

  useEffect(() => {
    setIsOpenGuestTime(buttonState.isOpenGuestTime);
    setIsShowTime(buttonState.isShowTime);
    setBtnState({ ready: buttonState.btnEnabled, loading: false });
  }, [buttonState]);

  useEffect(() => {
    const gidsString = searchParams.get('gids') || '';
    const gids = gidsString.split(',').filter(Boolean);
    const devices = gManageGroup.deviceGroups.Items.filter((it) => gids.includes(it.gid));
    setItemsGroupDevice(devices);
  }, [gManageGroup.deviceGroups]);

  useEffect(() => {
    setItemsGroupMember(gManageEmployee.employeeGroups);
  }, [gManageEmployee.employeeGroups]);

  const submitShare = () => {
    const deviceUUIDs = [...new Set(itemsGroupDevice.flatMap((item) => item.uuids))];
    let memberInfo = itemsGroupMember.find((item) => item.gid === valueGroupMember);
    let body = {};
    body.keyLevel = valueKeyPermissions;
    body.members = memberInfo.uuids;
    body.devices = deviceUUIDs;
    body.mid = memberInfo.gid;
    body.dids = itemsGroupDevice.flatMap((item) => item.gid);
    if (valueKeyPermissions === '2') {
      if (isShowTime) {
        body.startTime = time.startTime;
        body.endTime = time.endTime;
      } else {
        body.startTime = '';
        body.endTime = '';
      }
    }
    setBtnState({ ready: buttonState.btnEnabled, loading: true });
    gManageGroup.shareDeviceGroupKeysToEmployeeGroup(body, () => {
      setBtnState({ ready: buttonState.btnEnabled, loading: false });
      navigate(-1);
    });
  };

  return (
    <>
      <Box>
        <Box sx={{ mb: '15px', bgcolor: 'white', borderRadius: '5px' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              p: '10px 5px',
            }}
          >
            <BackButton size="small" onClick={() => window.history.back()}>
              <Typography variant="h2" sx={{ ml: '5px', color: 'black' }}>
                {t('manage.share.selectedDevices')}
              </Typography>
            </BackButton>
          </Box>

          <DataTable
            isMobile={gMediaType.isMobile}
            isAdd={false}
            data={itemsGroupDevice}
            isBind={false}
            isBack={false}
            isPagination={false}
            isHideToolBar={true}
            selectableRows={'none'}
            isShowFooter={false}
            columns={[
              {
                name: 'name',
                label: t('manage.group.doorGroupName'),
              },
            ]}
          />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', p: 2 }}>
          <CmChooseRadio
            items={itemsGroupMember || []}
            keyProp={'gid'}
            labelProp={labelProp}
            legend={t('manage.group.selectUserGroup')}
            radioCallValue={(value) => setValueGroupMember(value)}
          />
          <CmChooseRadio
            items={itemsKeyPermissions || []}
            keyProp={keyProp}
            labelProp={labelProp}
            mr={'5px'}
            legend={t('manage.group.selectKeyPermission')}
            orientation={'horizontal'}
            radioCallValue={(value) => setValueKeyPermissions(value)}
          />
          {isOpenGuestTime && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: gMediaType.isMobile ? 'column' : 'row',
                marginTop: '8px',
                alignItems: gMediaType.isMobile ? 'flex-start' : 'flex-end',
              }}
            >
              <CmChooseRadio
                items={itemsGuestTime}
                keyProp={keyProp}
                labelProp={labelProp}
                mr={'8px'}
                legend={t('manage.group.setGuestValidTime')}
                orientation={'horizontal'}
                radioCallValue={(value) => setValueGuestTime(value)}
              />
              {isShowTime && (
                <CmDataPicker
                  callTime={callTime}
                  sx={{
                    display: 'flex',
                    marginBottom: '10px',
                    flexDirection: gMediaType.isMobile ? 'column' : 'row',
                    justifyContent: gMediaType.isMobile ? 'space-between' : 'start',
                    alignItems: 'center',
                    marginLeft: '40px',
                    flexGrow: '1',
                  }}
                />
              )}
            </Box>
          )}

          <LoadingButton
            size="small"
            variant={'contained'}
            sx={{
              width: '116px',
              marginTop: '10px',
              marginLeft: '12px',
              padding: '4px 10px',
              borderRadius: '6px',
              color: 'white',
            }}
            loading={btnState.loading}
            disabled={!btnState.ready}
            onClick={submitShare}
            disableElevation
          >
            {t('manage.group.issueKey')}
          </LoadingButton>
        </Box>
      </Box>
    </>
  );
};

export default GroupShare;
