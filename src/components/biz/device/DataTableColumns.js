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
import { RoleLabel } from '@/utils/accessLabels';
import i18n from '@/i18n';

const cardColumns = ({ isMobile, gManageEmployee, _click, ref, listDevices }) => [
  {
    name: 'name',
    label: i18n.t('bizui.columns.cardName'),
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
    label: i18n.t('bizui.common.user'),
    options: {
      customBodyRender: (value, _tableMeta, _updateValue) => {
        return <Typography variant="h5">{gManageEmployee.findEmployeeById(value).employeeName}</Typography>;
      },
    },
  },
  {
    name: 'uuids',
    label: i18n.t('bizui.common.authDevices'),
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
                <Typography variant="h5">
                  {i18n.t('bizui.common.authDeviceCount', { count: deviceNames?.length ?? 0 })}
                </Typography>
              </Tooltip>
            </div>
          </>
        );
      },
    },
  },
];

const membersGroup = () => [
  {
    name: 'name',
    label: i18n.t('bizui.columns.groupName'),
  },

  {
    name: 'members',
    label: i18n.t('bizui.columns.groupKeys'),

    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        return (
          <>
            {value && value.length > 0 ? (
              value.map((item) => <Chip key={item.memberGName} label={item.memberGName} style={{ margin: 1 }} />)
            ) : (
              <Typography sx={{ fontSize: '14px', color: '#cccccc' }}>{i18n.t('bizui.common.notSet')}</Typography>
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
    label: i18n.t('bizui.columns.doorGroupName'),
  },

  {
    name: 'members',
    label: i18n.t('bizui.columns.groupKeyHolders'),

    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        return (
          <>
            {value && value.length > 0 ? (
              value.map((item) => <Chip key={item.memberGName} label={item.memberGName} style={{ margin: 1 }} />)
            ) : (
              <Typography sx={{ fontSize: '14px', color: '#cccccc' }}>{i18n.t('bizui.common.notSet')}</Typography>
            )}
          </>
        );
      },
    },
  },

  {
    name: 'uuids',
    label: i18n.t('bizui.columns.bulkActions'),

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
              {i18n.t('bizui.columns.bulkUnlock')}
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
              {i18n.t('bizui.columns.bulkLock')}
            </Button>
          </Box>
        );
      },
    },
  },
];

const groupMember = () => [
  {
    name: 'employeeName',
    label: i18n.t('bizui.common.userName'),
  },
  {
    name: 'employeeEmail',
    label: i18n.t('bizui.common.email'),
  },
];

const groupMemberKey = ({ click }) => [
  {
    name: 'memberGName',
    label: i18n.t('bizui.columns.deviceGroupName'),

    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        console.log('memberGName', value);
        return <Typography variant="h5">{value}</Typography>;
      },
    },
  },

  {
    name: 'keyLevel',
    label: i18n.t('bizui.columns.keyLevel'),
    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        let data = i18n.t('contacts.guestKey');

        if (value === '0' || value === 0) {
          data = i18n.t('contacts.ownerKey');
        }
        if (value === '1' || value === 1) {
          data = i18n.t('contacts.managerKey');
        }
        return <Typography variant="h5">{data}</Typography>;
      },
    },
  },
  {
    name: 'msgdata',
    label: i18n.t('bizui.columns.validPeriod'),
    options: {
      customBodyRender: (value, _tableMeta, _updateValue) => {
        return <Typography variant="h5">{value}</Typography>;
      },
    },
  },
  {
    name: 'did',
    label: i18n.t('bizui.common.delete'),
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
    label: i18n.t('bizui.columns.deviceGroupName'),
  },
  {
    name: 'keyLevel',
    label: i18n.t('bizui.columns.keyLevel'),
    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        let data = i18n.t('contacts.guestKey');

        if (value === '0' || value === 0) {
          data = i18n.t('contacts.ownerKey');
        }
        if (value === '1' || value === 1) {
          data = i18n.t('contacts.managerKey');
        }
        return <Typography variant="h5">{data}</Typography>;
      },
    },
  },
  {
    name: 'msgdata',
    label: i18n.t('bizui.columns.validPeriod'),
    options: {
      customBodyRender: (value, _tableMeta, _updateValue) => {
        return <Typography variant="h5">{value}</Typography>;
      },
    },
  },
  {
    name: 'mid',
    label: i18n.t('bizui.common.delete'),
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
    label: i18n.t('bizui.common.userName'),
    options: {
      filter: false,
      sort: false,
    },
  },
  {
    name: 'employeeEmail',
    label: i18n.t('bizui.common.email'),
    options: {
      filter: false,
      sort: false,
    },
  },
  {
    name: 'department',
    label: i18n.t('bizui.common.department'),
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
            {value === undefined ? i18n.t('bizui.common.notSet') : value}
          </span>
        );
      },
    },
  },
  {
    name: 'phone',
    label: i18n.t('bizui.columns.phone'),
    options: {
      filter: false,
      customBodyRender: (value) => {
        return (
          <span
            style={{
              color: value === undefined ? 'lightgray' : 'rgba(0, 0, 0, 0.87)',
            }}
          >
            {value === undefined ? i18n.t('bizui.common.notSet') : value}
          </span>
        );
      },
    },
  },

  {
    name: 'tag',
    label: i18n.t('bizui.common.role'),
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
                <Chip key={index} label={<RoleLabel tag={tag} />} style={{ margin: 1 }} />
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
  const findLockStateIdx = ssmColums.findIndex((it) => it.name === 'deviceUUID');
  ssmColums.splice(findLockStateIdx, 1, {
    name: 'stateInfo',
    label: i18n.t('bizui.columns.linkedSesame'),
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
    label: i18n.t('bizui.common.deviceName'),
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
    label: i18n.t('bizui.columns.battery'),
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
    label: i18n.t('bizui.columns.lockButton'),
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
              position={
                c.stateInfo?.wm2State === true && Number.isFinite(c.stateInfo?.position)
                  ? Math.trunc((c.stateInfo.position * 360) / 1024)
                  : undefined
              }
              shareKey={c.secretKey}
            />
          );
        }
      },
    },
  },
];

const deviceShareCanChooseEmployee = () => [
  { name: 'employeeName', label: i18n.t('bizui.common.userName') },
  {
    name: 'tag',
    label: i18n.t('bizui.columns.userPermission'),
    options: { customBodyRender: (value) => value?.map((tag) => <RoleLabel key={tag} tag={tag} />) },
  },
  { name: 'employeeEmail', label: i18n.t('bizui.common.email') },
  { name: 'department', label: i18n.t('bizui.common.department') },
];

const deviceItemCards = ({ gManageDevice, ref }) => [
  {
    name: 'name',
    label: i18n.t('bizui.columns.cardName'),
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
    label: i18n.t('bizui.common.authDevices'),
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
                <Typography sx={{ fontSize: '14px !important' }}>
                  {i18n.t('bizui.common.authDeviceCount', { count: deviceNames?.length ?? 0 })}
                </Typography>
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
    label: i18n.t('bizui.common.role'),
    options: {
      filter: true,
      filterType: 'dropdown',
      sort: false,
      customBodyRender: (value) => <RoleLabel tag={value} />,
    },
  },
  {
    name: 'access',
    label: i18n.t('bizui.columns.viewablePages'),
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
                  label={item === '権限なし' ? i18n.t('bizui.columns.noAccess') : item}
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
    label: i18n.t('bizui.common.delete'),
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
    label: i18n.t('bizui.columns.passcodeName'),
  },

  {
    name: 'passwordID',
    label: i18n.t('bizui.columns.passcode'),
    options: {
      customBodyRender: (value, _dataIndex, _rowIndex) => {
        return <Typography variant="h5">{gUtils.binaryToDecimal(value)}</Typography>;
      },
    },
  },
  {
    name: 'uuids',
    label: i18n.t('bizui.common.authDevices'),
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
                <Typography sx={{ fontSize: '14px !important' }}>
                  {i18n.t('bizui.common.authDeviceCount', { count: deviceNames?.length ?? 0 })}
                </Typography>
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
  deviceShareCanChooseEmployee,
  deviceItemCards,
  companyRole,
};
