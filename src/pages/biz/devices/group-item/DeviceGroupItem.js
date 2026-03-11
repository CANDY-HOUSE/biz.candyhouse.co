import React, { useContext, useEffect, useState } from 'react';
import { Card, Box, IconButton } from '@mui/material';
import DataTable from '@/components/biz/device/DataTable';
import CheckTable from '@/components/biz/CheckTable';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import { useSearchParams } from 'react-router-dom';
import { gUtils } from '@/utils/gUtils';
import EditableText from '@/components/EditableText';

const DeviceGroupItem = () => {
  const { gManageGroup, gManageEmployee, setCustomModalOpen, setModalContent, gIot, gManageDevice, gMediaType } =
    useContext(GlobalStateContext);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([]);
  const [ssmItems, setSsmItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchParams] = useSearchParams();
  const gid = searchParams.get('gid') || '';

  const fetchEmployeeGroups = () => {
    gManageGroup.getEmployeeGroup(gid, (res) => {
      const userGroups = res.data || [];
      const members = userGroups.map((uitem) => {
        const findItem = gManageEmployee.employeeGroups.find((item) => item.gid === uitem.mid);
        let time = '常時利用';
        if (uitem.startTime && uitem.endTime) {
          time = gUtils.getStartTimeEndTime(uitem);
        }
        return {
          memberGName: findItem?.name ?? uitem.mid,
          keyLevel: uitem.keyLevel,
          msgdata: time,
          mid: uitem.mid,
        };
      });
      setMembers(members);
    });
  };

  useEffect(() => {
    fetchEmployeeGroups();
  }, []);

  useEffect(() => {
    const deviceItem = gManageGroup.deviceGroups.Items.find((item) => item.gid === gid);
    deviceItem &&
      setSsmItems(
        gManageDevice.filteredSsmDevices.filter((item) => !deviceItem.uuids.some((i) => i === item.deviceUUID))
      );
  }, [gManageDevice.filteredSsmDevices]);

  useEffect(() => {
    // 默认标题
    const deviceItem = gManageGroup.deviceGroups.Items.find((item) => item.gid === gid);
    if (!deviceItem) return;
    setTitle(deviceItem?.name || '');
    // 获取设备组绑定的设备
    const devices = gManageDevice.filteredSsmDevices.filter((item) => deviceItem.uuids.includes(item.deviceUUID));
    setItems(devices);
  }, [gManageGroup.deviceGroups, gManageDevice.filteredSsmDevices]);

  const btnAddDevice = () => {
    setCustomModalOpen(true);
    setModalContent(
      <CheckTable
        title={'デバイスを選択'}
        data={ssmItems}
        selectableRows={'multiple'}
        enableFilter={true}
        useCustomSelection={true}
        setOpenModal={setCustomModalOpen}
        handleCheck={(items) => {
          setCustomModalOpen(false);
          console.log('设备', items);
          const deviceItem = gManageGroup.deviceGroups.Items.find((item) => item.gid === gid);
          gManageGroup.addDeviceInGroup(gid, deviceItem.uuids, items, (_res) => {
            gManageGroup.getDeviceGroups();
          });
        }}
        isWifi={false}
      />
    );
  };

  return (
    <>
      <Card sx={{ padding: '10px', pb: '0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton size="small" onClick={() => window.history.back()}>
            <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
          </IconButton>
          <EditableText
            style={{
              fontSize: '1.2em',
              fontWeight: 'bold',
              lineHeight: '1.3',
            }}
            initialValue={title}
            onSave={(newValue, callback) => {
              if (!newValue || !callback) {
                return;
              }
              gManageGroup.postDeviceGroupInfo({ gid, name: newValue }, (res) => {
                callback(res.success);
              });
            }}
          />
        </Box>
      </Card>
      <DataTable
        isMobile={gMediaType.isMobile}
        isShowFooter={false}
        callAdd={btnAddDevice}
        isAdd={true}
        data={items}
        isBind={false}
        isBack={false}
        text={`デバイス(${items.length})`}
        columns={DataTableColumns.ssmDevices({ gIot: gIot })}
        callDelData={(items) => {
          const deviceItem = gManageGroup.deviceGroups.Items.find((item) => item.gid === gid);
          gManageGroup.removeDeviceInGroup(gid, deviceItem.uuids, items, (res) => {
            gManageGroup.getDeviceGroups();
            console.log('删除设备', res);
          });
        }}
      />
      <DataTable
        isMobile={gMediaType.isMobile}
        isShowFooter={false}
        isAdd={false}
        isDel={false}
        isCsv={false}
        data={members}
        isBind={false}
        isBack={false}
        text={`グループ鍵`}
        selectableRows={'none'}
        columns={DataTableColumns.groupDeviceKey({
          click: (mid) => {
            let result = members.find((item) => item.mid === mid);
            if (result) {
              const data = { ...result, did: searchParams.get('gid') };
              delete data.memberGName;
              delete data.msgdata;
              gManageGroup.removeEmployeeGroup(data, (_result) => {
                fetchEmployeeGroups();
              });
            }
          },
        })}
      />
    </>
  );
};

export default DeviceGroupItem;
