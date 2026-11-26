import { Box, Typography, Button, FormControl, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import MUIDataTable from 'mui-datatables';
import Hider from '@/components/biz/Hider';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Fragment, useContext, useEffect, useState } from 'react';
import { CmDataPicker } from '@/components/biz/device/CmDataPicker';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';
import { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import KeyLevelSelector from '@/components/biz/KeyLevelSelector';
import { useTranslation } from 'react-i18next';
import { PcPage, PcRow, PcSection } from '@/components/PcGrouped';
import { ios } from '@/theme/appHomeStyle';
import { RoleLabel } from '@/utils/accessLabels';
registerLocale('ja', ja);

const DeviceShare = () => {
  const { gManageGroup, gManageEmployee, gManageDevice, gMediaType } = useContext(GlobalStateContext);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [startDate, setStartDate] = useState(+new Date());
  const [endDate, setEndDate] = useState(+new Date() + 1800000);
  const [guestKeyTime, setGuestKeyTime] = useState('常時利用');
  const [level, setLevel] = useState(1);
  const [disableSend, setDisableSend] = useState(true);
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const didsString = searchParams.get('dids') || '';
    const dids = didsString.split(',').filter(Boolean);
    const devices = gManageDevice.companyDevices.filter((it) => dids.includes(it.deviceUUID));
    setSelectedDevices(devices);
  }, [gManageDevice.companyDevices]);

  const checkShare = (selectedRows) => {
    const list = gManageEmployee.employees.Items;
    let indexArr = [];
    // eslint-disable-next-line
    selectedRows.data.map((item) => {
      delete item.index;
      indexArr.push(...Object.values(item));
    });
    const checkShare = list.filter((item, index) => {
      return indexArr.includes(index);
    });
    setSelectedUsers(checkShare);
  };

  const submitShare = async (cb) => {
    const allItems = selectedUsers.flatMap((user) =>
      selectedDevices.map((device) => ({
        ...device,
        ...user,
        keyLevel: level,
        startTime: guestKeyTime === '一時利用' ? Math.floor(startDate / 1000) : '',
        endTime: guestKeyTime === '一時利用' ? Math.floor(endDate / 1000) : '',
      }))
    );
    gManageGroup.shareDeviceKeysToEmployees(allItems, cb);
  };

  return (
    <PcPage title={t('manage.share.issueKey')} onBack={() => window.history.back()}>
      <PcSection title={t('manage.share.selectedDevices')}>
        {selectedDevices.map((device) => (
          <PcRow key={device.deviceUUID}>
            <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <Typography sx={{ fontSize: 16, color: ios.label }}>{device.deviceName}</Typography>
              <Typography sx={{ mt: '2px', fontSize: 13, color: ios.secondaryLabel }}>{device.deviceUUID}</Typography>
            </Box>
            <Typography sx={{ flexShrink: 0, fontSize: 15, color: ios.secondaryLabel }}>
              {device.keyLevel === 0
                ? t('contacts.ownerKey')
                : device.keyLevel === 1
                  ? t('contacts.managerKey')
                  : t('contacts.guestKey')}
            </Typography>
          </PcRow>
        ))}
      </PcSection>
      <Hider show={showShare}>
        <PcSection
          title={t('manage.share.selectedUsers')}
          action={
            <Button
              size="small"
              sx={{ minWidth: 'auto', mr: '-8px', color: ios.tint }}
              onClick={() => {
                setSelectedUsers([]);
                setShowShare(false);
              }}
            >
              {t('manage.share.reselect')}
            </Button>
          }
        >
          {selectedUsers.map((user, index) => (
            <PcRow key={user.subUUID || user.employeeEmail || index}>
              <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <Typography sx={{ fontSize: 16, color: ios.label }}>{user.employeeName}</Typography>
                <Typography sx={{ mt: '2px', fontSize: 13, color: ios.secondaryLabel }}>
                  {user.employeeEmail}
                </Typography>
              </Box>
              <Typography sx={{ flexShrink: 0, fontSize: 15, color: ios.secondaryLabel }}>
                {user.tag?.map((tag, i) => (
                  <Fragment key={tag}>
                    {i > 0 && ' / '}
                    <RoleLabel tag={tag} />
                  </Fragment>
                ))}
              </Typography>
            </PcRow>
          ))}
        </PcSection>
        <PcSection title={t('manage.share.selectUsers')}>
          <MUIDataTable
            title=""
            columns={DataTableColumns.deviceShareCanChooseEmployee()}
            data={gManageEmployee.employees.Items}
            options={{
              setTableProps: () => {
                return {
                  size: 'small',
                  padding: 'none',
                  sx: {
                    '& .MuiTableRow-root': {
                      borderTop: 'none',
                      borderBottom: gMediaType.isMobile ? 'solid 1px rgba(0, 0, 0, 0.10)' : 'none',
                    },
                    '& .MuiTableCell-root': {
                      borderBottom: 'none',
                    },
                    '& .MuiTableCell-paddingCheckbox': {
                      padding: '0',
                      paddingLeft: '8px',
                    },
                    '& .tss-1vd39vz-MUIDataTableBodyCell-stackedCommon': {
                      fontSize: '13px',
                    },
                  },
                };
              },
              search: false,
              print: false,
              filter: true,
              toolbar: false,
              download: false,
              viewColumns: false,
              customToolbarSelect: (selectedRows, displayData) => (
                <div style={{ marginRight: '24px' }}>
                  <Button
                    disableElevation
                    variant="contained"
                    size="small"
                    sx={{ color: 'white' }}
                    onClick={() => {
                      checkShare(selectedRows, displayData);
                      setShowShare(true);
                      setDisableSend(false);
                    }}
                  >
                    {t('manage.share.confirm')}
                  </Button>
                </div>
              ),
              filterType: 'textField',
              elevation: 0,
              textLabels: {
                pagination: {
                  next: t('contacts.nextPage'),
                  previous: t('contacts.previousPage'),
                  rowsPerPage: t('contacts.rowsPerPage'),
                  displayRows: '/',
                },
              },
            }}
          />
        </PcSection>
      </Hider>
      <PcSection title={t('contacts.keyPermission')} cardSx={{ px: '20px', py: '6px' }}>
        <KeyLevelSelector
          bare
          onConfirm={(keyLevel) => {
            setLevel(keyLevel);
          }}
        />
      </PcSection>
      <Hider show={showShare && level > 1}>
        <PcSection title={t('manage.share.setValidTime')} cardSx={{ px: '20px', py: '6px', overflow: 'visible' }}>
          <FormControl fullWidth>
            <RadioGroup
              row
              value={guestKeyTime}
              onChange={(e) => {
                setGuestKeyTime(e.target.value);
              }}
            >
              <FormControlLabel value="常時利用" control={<Radio />} label={t('contacts.alwaysAvailable')} />
              <Box sx={{ display: 'flex', flexGrow: '1' }}>
                <FormControlLabel value="一時利用" control={<Radio />} label={t('manage.share.temporary')} />
                <Hider show={guestKeyTime === '一時利用'}>
                  <CmDataPicker
                    callTime={(startTime, endTime) => {
                      setStartDate(startTime);
                      setEndDate(endTime);
                    }}
                    sx={{
                      display: 'flex',
                      flexDirection: gMediaType.isMobile ? 'column' : 'row',
                      justifyContent: gMediaType.isMobile ? 'space-between' : 'start',
                      alignItems: 'center',
                      marginLeft: '40px',
                      flexGrow: '1',
                    }}
                  />
                </Hider>
              </Box>
            </RadioGroup>
          </FormControl>
        </PcSection>
      </Hider>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LoadingButton
          disableElevation
          loading={loading}
          sx={{ minWidth: 140, height: 40, borderRadius: '10px', fontSize: 15, fontWeight: 600, color: 'white' }}
          variant="contained"
          disabled={selectedUsers.length === 0 || disableSend}
          onClick={() => {
            setLoading(true);
            submitShare(() => {
              setLoading(false);
              navigate(-1);
            });
          }}
        >
          {t('manage.share.issueKey')}
        </LoadingButton>
      </Box>
    </PcPage>
  );
};

export default DeviceShare;
