import {
  Card,
  CardHeader,
  Box,
  Typography,
  Button,
  CardContent,
  IconButton,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import MUIDataTable from 'mui-datatables';
import Hider from '@/components/biz/Hider';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useContext, useEffect, useState } from 'react';
import { CmDataPicker } from '@/components/biz/device/CmDataPicker';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';
import DataTable from '@/components/biz/device/DataTable';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import KeyLevelSelector from '@/components/biz/KeyLevelSelector';
registerLocale('ja', ja);

const DeviceShare = () => {
  const { gManageGroup, gManageEmployee, gManageDevice, gMediaType } = useContext(GlobalStateContext);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [startDate, setStartDate] = useState(+new Date());
  const [endDate, setEndDate] = useState(+new Date() + 1800000);
  const [guestKeyTime, setGuestKeyTime] = useState('常時利用');
  const [level, setLevel] = useState(2);
  const [disableSend, setDisableSend] = useState(true);
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    <>
      <Box sx={{ mb: '15px', bgcolor: 'white', borderRadius: '5px' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            p: '10px 5px',
          }}
        >
          <IconButton size="small" onClick={() => window.history.back()}>
            <KeyboardArrowLeftIcon />
            <Typography variant="h2" sx={{ ml: '5px', color: 'black' }}>
              選択済デバイス
            </Typography>
          </IconButton>
        </Box>
        <DataTable
          isMobile={gMediaType.isMobile}
          isAdd={false}
          data={selectedDevices}
          isBind={false}
          isBack={false}
          isPagination={false}
          isHideToolBar={true}
          selectableRows={'none'}
          isShowFooter={false}
          columns={DataTableColumns.deviceShareFromDevice()}
        />
      </Box>
      <Hider show={showShare}>
        <Box sx={{ mb: '15px', bgcolor: 'white', borderRadius: '5px' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: '10px 15px',
            }}
          >
            <Typography variant="h2">選択済ユーザー</Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setSelectedUsers([]);
                setShowShare(false);
              }}
            >
              再選択
            </Button>
          </Box>
          <DataTable
            isMobile={gMediaType.isMobile}
            isAdd={false}
            data={selectedUsers}
            isBind={false}
            isBack={false}
            isPagination={false}
            isHideToolBar={true}
            selectableRows={'none'}
            columns={DataTableColumns.deviceShareChoosedEmployee()}
          />
        </Box>
        <MUIDataTable
          title={<Typography variant="h2">選択済ユーザー</Typography>}
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
                  {'確認'}
                </Button>
              </div>
            ),
            filterType: 'textField',
            elevation: 0,
            textLabels: {
              pagination: {
                next: 'Next Page',
                previous: 'Previous Page',
                rowsPerPage: '表示数',
                displayRows: '/',
              },
            },
          }}
        />
      </Hider>
      <KeyLevelSelector
        onConfirm={(keyLevel) => {
          setLevel(keyLevel);
        }}
      />
      <Hider show={showShare && level > 1}>
        <Card sx={{ overflow: 'unset' }}>
          <CardHeader title={<Typography variant="h2">有効時間を設定</Typography>} sx={{ pb: '5px' }} />
          <CardContent>
            <FormControl fullWidth>
              <RadioGroup
                row
                value={guestKeyTime}
                onChange={(e) => {
                  setGuestKeyTime(e.target.value);
                }}
              >
                <FormControlLabel value="常時利用" control={<Radio />} label="常時利用" />
                <Box sx={{ display: 'flex', flexGrow: '1' }}>
                  <FormControlLabel value="一時利用" control={<Radio />} label="一時利用" />
                  <Hider show={guestKeyTime === '一時利用'}>
                    <CmDataPicker
                      callTime={(startTime, endTime) => {
                        setStartDate(startTime);
                        setEndDate(endTime);
                      }}
                      sx={{
                        display: 'flex',
                        flexDirection: gMediaType.isMobile ? 'column' : 'row',
                        marginBottom: '10px',
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
          </CardContent>
        </Card>
      </Hider>
      <LoadingButton
        disableElevation
        loading={loading}
        size="small"
        sx={{ m: '15px', color: 'white' }}
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
        合鍵発行
      </LoadingButton>
    </>
  );
};

export default DeviceShare;
