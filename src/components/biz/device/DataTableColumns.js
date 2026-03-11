import DeleteItem from '@/components/biz/DeleteItem';
import React from 'react';
import { Box, Button, Chip, Tooltip, Typography } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import VIotSwitch from './VIotSwitch';
import { gUtils } from '@/utils/gUtils';
import { biz3utils } from '@/utils/biz3utils';
import RoleAccessChip from '@/components/biz/RoleAccessChip';
import TagAccessAdd from '@/components/biz/TagAccessAdd';
import { BatteryLevel } from './BatteryLevel';

const cardColumns = ({ isMobile, gManageEmployee, _click, ref, listDevices }) => [
  {
    name: 'name',
    label: 'カード名',
    options: {
      customBodyRender: (value, tableMeta, _updateValue) => {
        const uuids = tableMeta.rowData[3];
        const path = window.location.pathname;
        if (uuids && uuids.length > 1 && path === '/cards') {
          return (
            <Typography variant="h5">
              {`${value}`}
              {!isMobile ? <br /> : <> </>}
              <span style={{ color: '#333', opacity: '0.5' }}>...</span>
            </Typography>
          );
        }
        return <Typography variant="h5">{`${value}`}</Typography>;
      },
    },
  },
  {
    name: 'cardID',
    label: 'ID',
    options: {
      customBodyRender: (value, _tableMeta, _updateValue) => {
        return <Typography variant="h5">{biz3utils.formatCardID(value)}</Typography>;
      },
    },
  },
  {
    name: 'subUUID',
    label: 'ユーザー',
    options: {
      customBodyRender: (value, _tableMeta, _updateValue) => {
        return <Typography variant="h5">{gManageEmployee.findEmployeeById(value).employeeName}</Typography>;
      },
    },
  },
  {
    name: 'uuids',
    label: '認証機器',
    options: {
      customBodyRender: (value, _tableMeta, _updateValue) => {
        let deviceNames = gUtils.uuidsToNames(value, listDevices);
        const deviceNamesList =
          deviceNames && deviceNames.length > 0 ? deviceNames.map((name) => `${name}`).join('\n') : '';
        const tooltipContent = <div style={{ whiteSpace: 'pre-line' }}>{deviceNamesList}</div>;
        return (
          <>
            <div ref={ref}>
              <Tooltip
                title={tooltipContent}
                placement="bottom-start"
                componentsProps={{
                  tooltip: {
                    sx: {
                      boxShadow: 1,
                      padding: '8px',
                      fontSize: '14px',
                    },
                  },
                }}
              >
                <Typography variant="h5">{`${deviceNames?.length ?? 0}台の認証機器`}</Typography>
              </Tooltip>
            </div>
          </>
        );
      },
    },
  },
];

const membersGroup = [
  {
    name: 'name',
    label: 'グループ名',
  },

  {
    name: 'members',
    label: '所有グループ鍵',

    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        return (
          <>
            {value && value.length > 0 ? (
              value.map((item) => <Chip key={item.memberGName} label={item.memberGName} style={{ margin: 1 }} />)
            ) : (
              <Typography sx={{ fontSize: '14px', color: '#cccccc' }}>未設定</Typography>
            )}
          </>
        );
      },
    },
  },
];

const deviceGroup = ({ clickCall }) => [
  {
    name: 'name',
    label: 'ドアグループ名',
  },

  {
    name: 'members',
    label: 'グループ鍵所有者',

    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        return (
          <>
            {value && value.length > 0 ? (
              value.map((item) => <Chip key={item.memberGName} label={item.memberGName} style={{ margin: 1 }} />)
            ) : (
              <Typography sx={{ fontSize: '14px', color: '#cccccc' }}>未設定</Typography>
            )}
          </>
        );
      },
    },
  },

  {
    name: 'uuids',
    label: '一括操作',

    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        //    console.log("集体开关", value, dataIndex, rowIndex)
        return (
          <Box sx={{ display: 'flex' }}>
            <Button
              size="medium"
              variant="contained"
              disableElevation
              sx={{
                display: 'block',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: '#28aeb1',
                '&:hover': {
                  backgroundColor: '#28aeb1',
                  opacity: '0.6',
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (clickCall) {
                  clickCall(value, 83);
                }
              }}
            >
              {'一括解錠'}
            </Button>
            <Button
              size="medium"
              variant="contained"
              disableElevation
              sx={{
                display: 'block',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: '#cc4a44',
                marginLeft: '20px',
                '&:hover': {
                  backgroundColor: '#cc4a44',
                  opacity: '0.6',
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (clickCall) {
                  clickCall(value, 82);
                }
              }}
            >
              {'一括施錠'}
            </Button>
          </Box>
        );
      },
    },
  },
];

const groupMember = [
  {
    name: 'employeeName',
    label: 'ユーザー名',
  },
  {
    name: 'employeeEmail',
    label: 'メールアドレス',
  },
];

const groupMemberKey = ({ click }) => [
  {
    name: 'memberGName',
    label: 'デバイスグループ名',

    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        console.log('memberGName', value);
        return <Typography variant="h5">{value}</Typography>;
      },
    },
  },

  {
    name: 'keyLevel',
    label: '合鍵権限',
    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        let data = 'ゲスト鍵';

        if (value === '0' || value === 0) {
          data = 'オーナー鍵';
        }
        if (value === '1' || value === 1) {
          data = 'マネージャー鍵';
        }
        return <Typography variant="h5">{data}</Typography>;
      },
    },
  },
  {
    name: 'msgdata',
    label: '有效時間',
    options: {
      customBodyRender: (value, _tableMeta, _updateValue) => {
        return <Typography variant="h5">{value}</Typography>;
      },
    },
  },
  {
    name: 'did',
    label: '削除',
    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        return (
          <DeleteItem
            handleCheck={(_e) => {
              if (click) click(value);
            }}
          />
        );
      },
    },
  },
];

const groupDeviceKey = ({ click }) => [
  {
    name: 'memberGName',
    label: 'デバイスグループ名',
  },
  {
    name: 'keyLevel',
    label: '合鍵権限',
    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        let data = 'ゲスト鍵';

        if (value === '0' || value === 0) {
          data = 'オーナー鍵';
        }
        if (value === '1' || value === 1) {
          data = 'マネージャー鍵';
        }
        return <Typography variant="h5">{data}</Typography>;
      },
    },
  },
  {
    name: 'msgdata',
    label: '有效時間',
    options: {
      customBodyRender: (value, _tableMeta, _updateValue) => {
        return <Typography variant="h5">{value}</Typography>;
      },
    },
  },
  {
    name: 'mid',
    label: '削除',
    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        return (
          <DeleteItem
            handleCheck={(_e) => {
              if (click) click(value);
            }}
          />
        );
      },
    },
  },
];

const employeeList = () => [
  {
    name: 'employeeName',
    label: 'ユーザー名',
    options: {
      filter: false,
      sort: false,
    },
  },
  {
    name: 'employeeEmail',
    label: 'メールアドレス',
    options: {
      filter: false,
      sort: false,
    },
  },
  {
    name: 'department',
    label: '所属',
    options: {
      filter: true,
      filterType: 'dropdown',
      customBodyRender: (value) => {
        return (
          <span
            style={{
              color: value === undefined ? 'lightgray' : 'rgba(0, 0, 0, 0.87)',
            }}
          >
            {value === undefined ? '未設定' : value}
          </span>
        );
      },
    },
  },
  {
    name: 'phone',
    label: '電話番号',
    options: {
      filter: false,
      customBodyRender: (value) => {
        return (
          <span
            style={{
              color: value === undefined ? 'lightgray' : 'rgba(0, 0, 0, 0.87)',
            }}
          >
            {value === undefined ? '未設定' : value}
          </span>
        );
      },
    },
  },

  {
    name: 'tag',
    label: 'ロール',
    options: {
      filter: true,
      filterType: 'dropdown',
      sort: false,

      customBodyRender: (_value, tableMeta, _updateValue, _dataIndex) => {
        const tags = tableMeta.rowData[4]; // 获取tags
        if (Array.isArray(tags)) {
          // 检查tags是否是数组
          return (
            <>
              {tags.map((tag, index) => (
                <Chip key={index} label={tag} style={{ margin: 1 }} />
              ))}
            </>
          );
        } else {
          return null; // 如果tags不存在或者不是数组，则返回null或者其他合适的值
        }
      },
    },
  },
];

const touchColumns = ({ datas, listNames }) => {
  const ssmColums = ssmDevices(datas, listNames);
  const findLockStateIdx = ssmColums.findIndex((it) => it.label === '開閉ボタン');
  ssmColums.splice(findLockStateIdx, 1, {
    name: 'stateInfo',
    label: '連携済みセサミ',
    options: {
      customBodyRender: (value, _tableMeta) => {
        if (!value.sesameDevices?.length) return '';
        return value.sesameDevices?.map((item) => {
          const displayName = listNames.find((it) => it.deviceUUID === item)?.deviceName;
          if (displayName) {
            return <Chip key={item} label={displayName} style={{ margin: '5px' }} />;
          } else {
            return null;
          }
        });
      },
    },
  });
  return ssmColums;
};

const ssmDevices = ({ datas, gIot }) => [
  {
    name: 'deviceName',
    label: 'デバイス名',
    options: {
      customBodyRender: (value, tableMeta) => {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ mr: '5px' }}>
              {value}
            </Typography>
            {tableMeta.rowData[1]?.wm2State !== undefined && (
              <WifiIcon style={{ color: tableMeta.rowData[1]?.wm2State === true ? '#28aeb1' : '#cccccc' }} />
            )}
          </Box>
        );
      },
    },
  },
  {
    name: 'stateInfo',
    label: '電池残量',
    options: {
      filter: false,
      sort: false,
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <BatteryLevel level={value?.batteryPercentage} />
          </Box>
        );
      },
    },
  },
  {
    name: 'deviceUUID',
    label: '開閉ボタン',
    options: {
      filter: false,
      sort: false,
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        if (datas && datas.length > 0) {
          let c = datas.find((item) => item.deviceUUID === value);
          if (!c) {
            return <></>;
          }
          let state = c.stateInfo?.CHSesame2Status;
          return (
            <VIotSwitch
              model={c.deviceModel}
              deviceUUID={c.deviceUUID}
              gIot={gIot}
              defaultState={state}
              shareKey={c.secretKey}
            />
          );
        }
      },
    },
  },
];

const deviceShareFromDevice = () => [
  { name: 'deviceName', label: 'デバイス名' },
  { name: 'deviceUUID', label: 'UUID' },
  {
    name: 'keyLevel',
    label: '合鍵権限',
    options: {
      customBodyRender: (value) => {
        return <>{value === 0 ? 'オーナー鍵' : value === 1 ? 'マネージャー鍵' : 'ゲスト鍵'}</>;
      },
    },
  },
];

const deviceShareChoosedEmployee = () => [
  { name: 'employeeName', label: 'ユーザー名' },
  { name: 'tag', label: 'ユーザー権限 ' },
  { name: 'employeeEmail', label: 'メールアドレス' },
];

const deviceShareCanChooseEmployee = () => [
  { name: 'employeeName', label: 'ユーザー名' },
  { name: 'tag', label: 'ユーザー権限 ' },
  { name: 'employeeEmail', label: 'メールアドレス' },
  { name: 'department', label: '所属' },
];

const deviceItemCards = ({ gManageDevice, ref }) => [
  {
    name: 'name',
    label: 'カード名',
  },
  {
    name: 'cardID',
    label: 'ID',
    options: {
      customBodyRender: (value) => {
        return <Typography sx={{ fontSize: '14px' }}>{biz3utils.formatCardID(value)}</Typography>;
      },
    },
  },
  {
    name: 'uuids',
    label: '認証機器',
    options: {
      customBodyRender: (value, _tableMeta, _updateValue) => {
        let deviceNames = gUtils.uuidsToNames(value, gManageDevice.filteredAccessControlDevices);
        const deviceNamesList =
          deviceNames && deviceNames.length > 0 ? deviceNames.map((name) => `${name}`).join('\n') : '';
        const tooltipContent = <div style={{ whiteSpace: 'pre-line' }}>{deviceNamesList}</div>;
        return (
          <>
            <div ref={ref}>
              <Tooltip
                title={tooltipContent}
                placement="bottom-start"
                componentsProps={{
                  tooltip: {
                    sx: {
                      boxShadow: 1,
                      padding: '8px',
                      fontSize: '14px',
                    },
                  },
                }}
              >
                <Typography
                  sx={{ fontSize: '14px !important' }}
                >{`${deviceNames?.length ?? 0}台の認証機器`}</Typography>
              </Tooltip>
            </div>
          </>
        );
      },
    },
  },
];

const companyRole = ({ companyRoles, setCompanyRoles, gManageEmployee, changeSingleAccess }) => [
  {
    name: 'tag',
    label: 'ロール',
    options: {
      filter: true,
      filterType: 'dropdown',
      sort: false,
    },
  },
  {
    name: 'access',
    label: '閲覧可能ページ',
    options: {
      filter: false,
      sort: false,
      customBodyRenderLite: (dataIndex) => {
        const tagSetting = companyRoles[dataIndex];
        let isShowAdd = tagSetting?.isShowAdd;
        return (
          <>
            {tagSetting?.access.map((item, index) => {
              let isLastRoleAccessChip = tagSetting?.access.length === 1;
              return (
                <RoleAccessChip
                  isShowAdd={isShowAdd && !isLastRoleAccessChip}
                  id={dataIndex}
                  key={index}
                  handleCheck={() => {
                    //1.前端陣列刪除所點擊的項目
                    let tmp = [...companyRoles];
                    let deleteFromAccess = tagSetting?.access.filter((i) => i !== item);
                    tmp[dataIndex].access = deleteFromAccess;
                    setCompanyRoles(tmp);
                    //2.後端覆蓋刪除完的資料
                    changeSingleAccess({ ...tagSetting });
                  }}
                  label={item}
                  rowChipLength={tagSetting?.access.length}
                  tag={tagSetting?.tag}
                />
              );
            })}
            {isShowAdd && (
              <TagAccessAdd tag={tagSetting} appAccessTags={gUtils.allTags} changeSingleAccess={changeSingleAccess} />
            )}
          </>
        );
      },
    },
  },
  {
    name: '削除',
    label: '削除',
    options: {
      filter: false,
      sort: false,
      empty: true,
      customBodyRenderLite: (dataIndex) => {
        const tagSetting = companyRoles[dataIndex];
        let isShowAdd = tagSetting?.isShowAdd;
        return (
          <>
            {isShowAdd && (
              <DeleteItem
                handleCheck={() => {
                  console.log('准备添加', tagSetting);
                  gManageEmployee.removeTag(tagSetting, async (_res) => {});
                }}
              />
            )}
          </>
        );
      },
    },
  },
];

const passwordColumns = ({ ref, listDevices }) => [
  {
    name: 'name',
    label: '暗証番号名',
  },

  {
    name: 'passwordID',
    label: '暗証番号',
    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        return <Typography variant="h5">{gUtils.binaryToDecimal(value)}</Typography>;
      },
    },
  },
  {
    name: 'uuids',
    label: '認証機器',
    options: {
      customBodyRender: (value, _tableMeta, _updateValue) => {
        let deviceNames = gUtils.uuidsToNames(value, listDevices);
        const deviceNamesList =
          deviceNames && deviceNames.length > 0 ? deviceNames.map((name) => `${name}`).join('\n') : '';
        const tooltipContent = <div style={{ whiteSpace: 'pre-line' }}>{deviceNamesList}</div>;
        return (
          <>
            <div ref={ref}>
              <Tooltip
                title={tooltipContent}
                placement="bottom-start"
                componentsProps={{
                  tooltip: {
                    sx: {
                      boxShadow: 1,
                      padding: '8px',
                      fontSize: '14px',
                    },
                  },
                }}
              >
                <Typography
                  sx={{ fontSize: '14px !important' }}
                >{`${deviceNames?.length ?? 0}台の認証機器`}</Typography>
              </Tooltip>
            </div>
          </>
        );
      },
    },
  },
];

export const DataTableColumns = {
  cardColumns,
  touchColumns,
  deviceGroup,
  groupMember,
  groupMemberKey,
  ssmDevices,
  groupDeviceKey,
  membersGroup,
  employeeList,
  passwordColumns,
  deviceShareFromDevice,
  deviceShareCanChooseEmployee,
  deviceShareChoosedEmployee,
  deviceItemCards,
  companyRole,
};
