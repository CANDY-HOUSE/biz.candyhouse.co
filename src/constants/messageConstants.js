export const ACTION_TYPES = {
  BIZ3_KEEP_ALIVE: 'biz3KeepAlive',
  BIZ3_GET_LOGIN_INFO: 'biz3GetLoginUser',
  BIZ3_MANAGE_DEVICE: 'biz3ManageDevice',
  BIZ3_MANAGE_COMPANY: 'biz3ManageCompany',
  BIZ3_MANAGE_EMPLOYEE: 'biz3ManageEmployee',
  BIZ3_MANAGE_EMPLOYEE_GROUP: 'biz3ManageEmployeeGroup',
  BIZ3_MANAGE_EMPLOYEE_DEVICE: 'biz3ManageEmployeeDevice',
  BIZ3_MANAGE_AC_AUTHDATA: 'biz3ManageAccessCtlAuthData',
  BIZ3_MANAGE_ROLE: 'biz3ManageRole',
  BIZ3_MANAGE_DEVICE_GROUP: 'biz3ManageDeviceGroup',
  BIZ3_MANAGE_PAYMENT: 'biz3ManagePayment',
  BIZ3_GET_DEVICEEMOLOYEEKEYS: 'biz3GetDeviceEmployeeKeys',
  BIZ3_GET_DEVICEHISTORY: 'biz3GetDeviceHistory',
  BIZ3_OPERATE_IOT: 'biz3OperateIoT',
  BIZ3_TRIGGER_LOCKER: 'biz3TriggerLocker',
  BIZ3_LIST_FIRMWARE: 'biz3ListFirmware',
  BIZ3_INVOKE_WEBAPI: 'biz3InvokeWebAPIs',
  BIZ3_GET_BATTERY_RECORD: 'biz3GetDeviceBatteryRecord',
  BIZ3_IR_REMOTE: 'biz3IRRemote',
  BIZ3_SCHEDULE: 'biz3Schedule',
};

export const STATUS_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
};

// webSocket 心跳包定时器间隔, 单位: 毫秒
export const WS_HEARTBEAT_INTERVAL_MS = 60000;
