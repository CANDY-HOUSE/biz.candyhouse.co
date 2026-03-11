import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, Box, Typography, CardContent, IconButton, TextField } from '@mui/material';
import CheckTable from '@/components/biz/CheckTable';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CfpSimpleTable from '@/components/biz/device/CfpSimpleTable';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import { createSearchParams, useNavigate } from 'react-router-dom';
import DataTable from '@/components/biz/device/DataTable';
import { LoadingButton } from '@mui/lab';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';

const DeviceGroup = () => {
  const {
    gStripe,
    gManageDevice,
    setCustomModalOpen,
    setModalContent,
    gManageGroup,
    gManageEmployee,
    gIot,
    gMediaType,
  } = useContext(GlobalStateContext);
  const [name, setName] = useState('');
  const [choosedItems, setChoosedItems] = useState([]);
  const [submitState, setSubmitState] = useState({ ready: false, loading: false });
  const [data, setData] = useState([]);
  const navigate = useNavigate();
  const floatingAddRef = useRef(null);

  useEffect(() => {
    if (!gStripe.customerInfo.companyID) return;
    if (!gManageEmployee.employeeGroups) {
      gManageEmployee.getEmployeeGroups();
    }
    gManageGroup.getDeviceGroups();
  }, [gStripe.customerInfo.companyID]);

  useEffect(() => {
    setData(applyGroups);
  }, [gManageGroup.deviceGroups, gManageEmployee.employeeGroups]);

  const applyGroups = useMemo(() => {
    const employeeGroupMap = new Map((gManageEmployee.employeeGroups || []).map((group) => [group.gid, group]));
    const nresult = gManageGroup.deviceGroups.Items.map((deviceGroup) => {
      const members = deviceGroup.employeeGroups.map((gid) => {
        const employeeGroup = employeeGroupMap.get(gid);
        return employeeGroup ? { ...employeeGroup, memberGName: employeeGroup.name } : { memberGName: gid };
      });
      return {
        ...deviceGroup,
        members,
      };
    });
    return nresult;
  }, [gManageGroup.deviceGroups, gManageEmployee.employeeGroups]);

  const deviceItems = useMemo(() => {
    return gManageDevice.filteredSsmDevices.filter(
      (item) => choosedItems.findIndex((choosedItem) => choosedItem.subUUID === item.subUUID) === -1
    );
  }, [choosedItems, gManageDevice.filteredSsmDevices]);

  useEffect(() => {
    if (name && choosedItems.length > 0) {
      setSubmitState({ ready: true, loading: false });
    } else {
      setSubmitState({ ready: false, loading: false });
    }
  }, [name, choosedItems]);

  const addDeviceGroupComp = useMemo(
    () => (
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '10px' }}>
              <Typography variant="h2">新規グループを追加</Typography>
            </Box>
          }
        />
        <CardContent
          sx={{
            paddingBottom: 'unset',
          }}
        >
          <TextField
            required
            size="small"
            id="outlined-basic"
            label="グループ名"
            variant="filled"
            value={name}
            sx={{
              width: '341px',
              borderRadius: '6px',
            }}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              margin: '10px 0px',
            }}
          >
            <Typography
              variant="body1"
              component="p"
              style={{
                fontFamily: "'Noto Sans JP', sans-serif",
                fontSize: '18px',
                fontWeight: 400,
                lineHeight: '27px',
                letterSpacing: '0.06em',
                textAlign: 'left',
              }}
            >
              {`デバイス(${choosedItems.length})`}
            </Typography>
            <IconButton
              disabled={deviceItems.length === 0}
              sx={{ marginTop: '4px' }}
              onClick={() => {
                setCustomModalOpen(true);
                setModalContent(
                  <CheckTable
                    title={'デバイスを選択'}
                    data={deviceItems}
                    selectableRows={'multiple'}
                    enableFilter={true}
                    useCustomSelection={true}
                    setOpenModal={setCustomModalOpen}
                    handleCheck={(value) => {
                      setCustomModalOpen(false);
                      setChoosedItems((prevState) => [...prevState, ...value]);
                    }}
                    isWifi={false}
                  />
                );
              }}
            >
              <AddCircleIcon style={{ color: deviceItems.length === 0 ? 'rgba(0, 0, 0, 0.26)' : '#28AEB1' }} />
            </IconButton>
          </Box>
          <CfpSimpleTable
            items={choosedItems}
            btnDel={(item) => {
              setChoosedItems((prevState) => prevState.filter((obj) => obj.deviceUUID !== item.deviceUUID));
            }}
          />
          <LoadingButton
            loading={submitState.loading}
            size="small"
            variant="outlined"
            disableElevation
            sx={{
              width: '64px',
              borderRadius: '6px',
              color: '#28aeb1',
            }}
            disabled={!submitState.ready}
            onClick={() => {
              let ids = choosedItems.map((item) => item.deviceUUID);
              setSubmitState({ ready: submitState.ready, loading: true });
              gManageGroup.addDeviceGroup(name, ids, () => {
                setSubmitState({ ready: false, loading: false });
                setName('');
                setChoosedItems([]);
                floatingAddRef.current.handleClose();
              });
            }}
          >
            登録
          </LoadingButton>
        </CardContent>
      </Card>
    ),
    [name, choosedItems, deviceItems, submitState.loading, submitState.ready]
  );

  return (
    <SesameFloatingAdd ref={floatingAddRef} isMobile={gMediaType.isMobile} popupComponent={addDeviceGroupComp}>
      <DataTable
        isMobile={gMediaType.isMobile}
        isAdd={false}
        data={data}
        isBind={false}
        isBack={false}
        rowHeight={'large'}
        isKey={true}
        callRowClick={(index) => {
          navigate({
            pathname: '/biz/devices/group-item',
            search: createSearchParams({ gid: data[index].gid }).toString(),
          });
        }}
        callAdd={() => {
          floatingAddRef.current.handleOpen();
        }}
        columns={DataTableColumns.deviceGroup({
          clickCall: (list, cmd) => {
            list.forEach((it) => {
              const device = deviceItems.find((item) => item.deviceUUID === it);
              if (device) {
                gIot.sendCommandToWM2({ device_id: it, cmd, sescretKey: device.secretKey });
              }
            });
          },
        })}
        callDelData={(items) => {
          let ids = items.map((item) => ({ gid: item.gid }));
          gManageGroup.removeDeviceGroups(ids);
        }}
        btnCallKey={(choosedItems) => {
          let gids = choosedItems.map((item) => item.gid).join(',');
          if (!gids) return;
          navigate({
            pathname: '/biz/devices/group-share',
            search: createSearchParams({ gids }).toString(),
          });
        }}
        callSearch={(e) => {
          if (!e) {
            setData(applyGroups);
            return;
          }
          const result = applyGroups.filter((item) => {
            return item.name.includes(e) || item.members.some((member) => member.memberGName.includes(e));
          });
          setData(result);
        }}
      />
    </SesameFloatingAdd>
  );
};

export default DeviceGroup;
