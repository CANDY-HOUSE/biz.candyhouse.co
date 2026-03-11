import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, TextField, Typography } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import CfpSimpleTable from '@/components/biz/device/CfpSimpleTable';
import DataTable from '@/components/biz/device/DataTable';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import CheckTable from '@/components/biz/CheckTable';
import { LoadingButton } from '@mui/lab';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '@mui/material';
import { CardHeader } from '@mui/material';
import { CardContent } from '@mui/material';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';

const EmployeeGroups = () => {
  const { gStripe, gManageEmployee, setModalContent, setCustomModalOpen, gManageGroup, gMediaType } =
    useContext(GlobalStateContext);
  const [tbData, settbData] = useState([]);
  const [name, setName] = useState('');
  const [choosedItems, setChoosedItems] = useState([]);
  const [submitState, setSubmitState] = useState({ ready: false, loading: false });
  const floatingAddRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (name && choosedItems.length > 0) {
      setSubmitState({ ready: true, loading: false });
    } else {
      setSubmitState({ ready: false, loading: false });
    }
  }, [name, choosedItems]);

  useEffect(() => {
    if (!gStripe.customerInfo.companyID) return;
    gManageEmployee.getEmployeeGroups();
    gManageGroup.getDeviceGroups();
  }, [gStripe.customerInfo.companyID]);

  const memberItems = useMemo(() => {
    return gManageEmployee.employees.Items.filter(
      (item) => choosedItems.findIndex((choosedItem) => choosedItem.subUUID === item.subUUID) === -1
    );
  }, [choosedItems, gManageEmployee.employees.Items]);

  useEffect(() => {
    settbData(applyGroups);
  }, [gManageGroup.deviceGroups, gManageEmployee.employeeGroups]);

  const applyGroups = useMemo(() => {
    const deviceGroupMap = new Map((gManageGroup.deviceGroups.Items || []).map((group) => [group.gid, group]));
    const nresult =
      gManageEmployee.employeeGroups?.map((employeeGroup) => {
        const members = (employeeGroup.deviceGroups || []).map((gid) => {
          const deviceGroup = deviceGroupMap.get(gid);
          return deviceGroup ? { ...deviceGroup, memberGName: deviceGroup.name } : { memberGName: gid };
        });
        return {
          ...employeeGroup,
          members,
        };
      }) || [];
    return nresult;
  }, [[gManageGroup.deviceGroups, gManageEmployee.employeeGroups]]);

  const addGroupComp = useMemo(() => {
    return (
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
              margin: '10px 0px 0px',
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
              {`ユーザー(${choosedItems.length})`}
            </Typography>
            <IconButton
              disabled={memberItems.length === 0}
              sx={{ marginTop: '4px' }}
              onClick={() => {
                setCustomModalOpen(true);
                setModalContent(
                  <CheckTable
                    title={'ユーザーを選択'}
                    customColumns={DataTableColumns.groupMember}
                    data={memberItems}
                    selectableRows={'multiple'}
                    enableFilter={true}
                    useCustomSelection={true}
                    setOpenModal={setCustomModalOpen}
                    handleCheck={(value) => {
                      setCustomModalOpen(false);
                      setChoosedItems((prevState) => [...prevState, ...value]);
                    }}
                  />
                );
              }}
            >
              <AddCircleIcon style={{ color: memberItems.length === 0 ? 'rgba(0, 0, 0, 0.26)' : '#28AEB1' }} />
            </IconButton>
          </Box>
          <CfpSimpleTable
            items={choosedItems}
            btnDel={(item) => {
              console.log('删除对象', item);
              setChoosedItems((prevState) => prevState.filter((obj) => obj.subUUID !== item.subUUID));
            }}
            name={'employeeName'}
          />
          <LoadingButton
            loading={submitState.loading}
            variant="outlined"
            size={gMediaType.isMobile ? 'large' : 'small'}
            fullWidth={gMediaType.isMobile}
            disableElevation
            disabled={!submitState.ready}
            onClick={() => {
              let uuids = choosedItems.map((item) => item.subUUID);
              setSubmitState({ ready: false, loading: true });
              gManageEmployee.addEmployeeGroup({ name, uuids }, (_res) => {
                setName('');
                setChoosedItems([]);
                setSubmitState({ ready: false, loading: false });
                floatingAddRef.current.handleClose();
              });
            }}
          >
            登録
          </LoadingButton>
        </CardContent>
      </Card>
    );
  }, [name, choosedItems, memberItems, submitState, setCustomModalOpen, setModalContent, gManageEmployee]);

  return (
    <SesameFloatingAdd ref={floatingAddRef} isMobile={gMediaType.isMobile} popupComponent={addGroupComp}>
      <DataTable
        isMobile={gMediaType.isMobile}
        isAdd={false}
        data={tbData}
        path={''}
        isBind={false}
        isBack={false}
        rowHeight={'large'}
        columns={DataTableColumns.membersGroup}
        callRowClick={(index) => {
          navigate({
            pathname: '/biz/employees/group-item',
            search: createSearchParams({ gid: tbData[index].gid }).toString(),
          });
        }}
        callAdd={
          gMediaType.isMobile
            ? null
            : () => {
                floatingAddRef.current.handleOpen();
              }
        }
        callDelData={(items) => {
          const gids = items.map((item) => item.gid);
          gManageEmployee.removeEmployeeGroups(gids);
        }}
        callSearch={(e) => {
          if (!e) {
            settbData(applyGroups);
            return;
          }
          const result = applyGroups.filter((item) => {
            return item.name.includes(e) || item.members.some((member) => member.memberGName.includes(e));
          });
          settbData(result);
        }}
      />
    </SesameFloatingAdd>
  );
};

export default EmployeeGroups;
