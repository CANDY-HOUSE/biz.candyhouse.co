import React, { useState, useContext, useEffect } from 'react';
import { Box, Card, IconButton } from '@mui/material';
import DataTable from '@/components/biz/device/DataTable';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useSearchParams } from 'react-router-dom';
import { gUtils } from '@/utils/gUtils';
import CheckTable from '@/components/biz/CheckTable';
import EditableText from '@/components/EditableText';

const EmployeeGroupItem = () => {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([]);
  const [listMember, setListMember] = useState([]);
  const [members, setMembers] = useState([]);
  const { setCustomModalOpen, setModalContent, gManageEmployee, gManageGroup, gStripe, gMediaType } =
    useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const gid = searchParams.get('gid') || '';

  useEffect(() => {
    // 默认标题
    const deviceItem = gManageEmployee.employeeGroups?.find((item) => item.gid === gid);
    if (!deviceItem) return;
    setTitle(deviceItem?.name || '');
    // 获取设备组绑定的设备
    const users = deviceItem.uuids.map((item) => {
      return gManageEmployee.employees.Items.find((i) => i.subUUID === item);
    });
    setItems(users);
    //可选择的雇员
    setListMember(gManageEmployee.employees.Items.filter((item) => !deviceItem.uuids.includes(item.subUUID)));
  }, [gManageEmployee.employeeGroups, gManageEmployee.employees]);

  const getDeviceGroup = () => {
    gManageEmployee.getDeviceGroup(gid, (res) => {
      const deviceGroups = res.data || [];
      const members = deviceGroups.map((uitem) => {
        const findItem = gManageGroup.deviceGroups.Items.find((item) => item.gid === uitem.did);
        let time = '常時利用';
        if (uitem.startTime && uitem.endTime) {
          time = gUtils.getStartTimeEndTime(uitem);
        }
        return {
          memberGName: findItem?.name ?? uitem.mid,
          keyLevel: uitem.keyLevel,
          msgdata: time,
          mid: uitem.mid,
          did: uitem.did,
        };
      });
      setMembers(members);
    });
  };

  useEffect(() => {
    getDeviceGroup();
  }, [gStripe.customerInfo.companyID]);

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
              gManageEmployee.postEmployeeGroupInfo({ gid, name: newValue }, (res) => {
                callback(res.success);
              });
            }}
          />
        </Box>
      </Card>
      <DataTable
        isShowFooter={false}
        isMobile={gMediaType.isMobile}
        callAdd={() => {
          setCustomModalOpen(true);
          setModalContent(
            <CheckTable
              title={'ユーザーを選択'}
              customColumns={DataTableColumns.groupMember}
              data={listMember}
              selectableRows={'multiple'}
              enableFilter={true}
              useCustomSelection={true}
              setOpenModal={setCustomModalOpen}
              handleCheck={(items) => {
                setCustomModalOpen(false);
                const userItem = gManageEmployee.employeeGroups?.find((item) => item.gid === gid);
                gManageEmployee.addEmployeeInGroup(gid, userItem.uuids, items, (res) => {
                  res.success && gManageEmployee.getEmployeeGroups();
                });
              }}
            />
          );
        }}
        isAdd={true}
        data={items}
        isBind={false}
        isBack={false}
        text={`ユーザー(${items.length})`}
        columns={DataTableColumns.groupMember}
        callDelData={(items) => {
          const userItem = gManageEmployee.employeeGroups?.find((item) => item.gid === gid);
          gManageEmployee.removeEmployeeInGroup(gid, userItem.uuids, items, (res) => {
            res.success && gManageEmployee.getEmployeeGroups();
          });
        }}
      />
      <DataTable
        isShowFooter={false}
        isMobile={gMediaType.isMobile}
        isAdd={false}
        isDel={false}
        isCsv={false}
        data={members}
        isBind={false}
        isBack={false}
        text={`グループ鍵`}
        selectableRows={'none'}
        columns={DataTableColumns.groupMemberKey({
          click: (did) => {
            let result = members.find((item) => item.did === did);
            if (result) {
              const param = {
                mid: result.mid,
                did: result.did,
                keyLevel: result.keyLevel,
              };
              gManageEmployee.removeDeviceGroup(param, (res) => {
                res.success && getDeviceGroup();
              });
            }
          },
          members,
        })}
      />
    </>
  );
};

export default EmployeeGroupItem;
