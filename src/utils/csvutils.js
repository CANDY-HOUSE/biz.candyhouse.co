import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { gUtils } from './gUtils';
// import { useLocation } from 'react'
import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';
import { PATHS } from '@/routes/manifest';
import i18n, { languages } from '@/i18n';

// Field -> header key, in template column order.
const importFields = {
  members: {
    userName: 'csv.header.userName',
    email: 'csv.header.email',
    department: 'csv.header.optionalDepartment',
    phone: 'csv.header.optionalPhone',
  },
  cards: {
    cardName: 'csv.header.cardName',
    id: 'csv.header.id',
    user: 'csv.header.user',
  },
  passcodes: {
    passcodeName: 'csv.header.passcodeName',
    passcode: 'csv.header.passcode',
  },
};

// Headers of files exported or downloaded as templates before the UI was translated.
const legacyHeaders = {
  'csv.header.userName': ['ユーザー名'],
  'csv.header.email': ['メールアドレス'],
  'csv.header.optionalDepartment': ['所属（任意）'],
  'csv.header.optionalPhone': ['電話番号（任意）'],
  'csv.header.cardName': ['カード名'],
  'csv.header.id': ['ID'],
  'csv.header.user': ['ユーザー'],
  'csv.header.passcodeName': ['暗証番号名'],
  'csv.header.passcode': ['暗証番号'],
};

const headerName = (name) =>
  String(name)
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase();

// Copies each field from whichever column carries its header in any language, keeping the original columns.
function normalizeCsvRows(rows, fields) {
  const aliases = Object.entries(fields).map(([field, key]) => {
    const names = [...languages.map(({ code }) => i18n.t(key, { lng: code })), ...(legacyHeaders[key] || [])];
    return [field, new Set(names.map(headerName))];
  });
  return rows.map((row) => {
    const normalized = { ...row };
    aliases.forEach(([field, names]) => {
      const column = Object.keys(row).find((name) => names.has(headerName(name)));
      if (column !== undefined) {
        normalized[field] = row[column];
      }
    });
    return normalized;
  });
}

const templateRow = (fields) => Object.fromEntries(Object.values(fields).map((key) => [i18n.t(key), '']));

function processDeviceHistoryItem(item) {
  const processedItem = { ...item };
  let status = processedItem.type;
  switch (status) {
    case 1:
    case 6:
    case 7:
    case 14:
    case 16:
      processedItem.type = i18n.t('csv.historyType.lock');
      break;
    case 2:
    case 8:
    case 15:
    case 17:
      processedItem.type = i18n.t('csv.historyType.unlock');
      break;
    case 18:
    case 19:
    case 20:
      processedItem.type = i18n.t('csv.historyType.botLockUnlock');
      break;
    case 90:
      processedItem.type = i18n.t('csv.historyType.open');
      break;
    case 91:
      processedItem.type = i18n.t('csv.historyType.close');
      break;
    default:
      processedItem.type = '';
  }
  if (processedItem.timestamp) {
    const time = processedItem.timestamp;
    processedItem.timestamp = new Date(time).toLocaleString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }
  if (processedItem.history_tag) {
    try {
      processedItem.history_tag = Buffer.from(processedItem.history_tag, 'base64').toString('utf8');
    } catch (e) {
      console.error('解码用户名失败', e);
      processedItem.history_tag = '';
    }
  } else {
    processedItem.history_tag = '';
  }
  let via = status;
  switch (via) {
    case 7:
    case 8:
      processedItem.via = i18n.t('csv.via.manual');
      break;
    case 1:
    case 2:
    case 18:
    case 90:
    case 91:
      processedItem.via = i18n.t('csv.via.bluetooth');
      break;
    case 6:
      processedItem.via = i18n.t('csv.via.autoLock');
      break;
    case 14:
    case 15:
    case 19:
      processedItem.via = i18n.t('csv.via.wifiModule');
      break;
    case 16:
    case 17:
    case 20:
      processedItem.via = i18n.t('csv.via.webApi');
      break;
    default:
      processedItem.via = '';
  }
  return processedItem;
}

function downloadTemplate(format) {
  try {
    let data = [];
    const pathname = window.location.pathname;
    if (pathname === PATHS.members.list) {
      data = [templateRow(importFields.members)];
    } else if (pathname === PATHS.accessControl.cards || pathname === PATHS.cards.index) {
      data = [templateRow(importFields.cards)];
    } else if (pathname === PATHS.accessControl.passwords) {
      data = [templateRow(importFields.passcodes)];
    } else {
      console.log(`no setting pathname download${format}`);
      return;
    }
    if (format === 'csv') {
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, 'sesamebiz.csv');
    } else if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, 'sesamebiz.xlsx');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

function downloadCsv() {
  downloadTemplate('csv');
}

function downloadExcelTemp() {
  downloadTemplate('excel');
}

// pathname picks the columns; callers outside the list's own page name it.
function downloadLists(list, isCsv = true, fileName = 'sesamebiz', pathname = window.location.pathname) {
  console.log('hey下载数据', list);

  // 定義各header
  const headersUserGroup = {
    name: 'csv.header.groupName',
    gid: 'csv.header.uuid',
    uuids: 'csv.header.linkedUsers',
  };
  const headersDeviceGroup = {
    name: 'csv.header.groupName',
    gid: 'csv.header.uuid',
    uuids: 'csv.header.linkedDevices',
  };
  const headersDeviceHistory = {
    type: 'csv.header.state',
    timestamp: 'csv.header.time',
    history_tag: 'csv.header.userName',
    via: 'csv.header.via',
  };
  const headersUser = {
    employeeName: 'csv.header.userName',
    employeeEmail: 'csv.header.email',
    subUUID: 'csv.header.subUUID',
    tag: 'csv.header.role',
    department: 'csv.header.optionalDepartment',
    phone: 'csv.header.optionalPhone',
  };
  const headersDevice = {
    deviceName: 'csv.header.deviceName',
    deviceModel: 'csv.header.model',
    deviceUUID: 'csv.header.deviceUUID',
    battery: 'csv.header.battery',
  };
  const headersDevice2 = {
    deviceName: 'csv.header.deviceName',
    deviceModel: 'csv.header.model',
    deviceUUID: 'csv.header.deviceUUID',
    battery: 'csv.header.battery',
  };
  const headersCfpDevice = {
    deviceName: 'csv.header.deviceName',
    deviceModel: 'csv.header.model',
    deviceUUID: 'csv.header.deviceUUID',
    battery: 'csv.header.battery',
    //  battery: "連携するセサミ",
  };
  const headersCfpCards = {
    name: 'csv.header.cardName',
    cardID: 'csv.header.id',
    subUUID: 'csv.header.user',
    uuids: 'csv.header.authDevices',
  };
  const headersFingers = {
    name: 'csv.header.fingerName',
    fingerID: 'csv.header.id',
    // id: "インデックス",
    memberName: 'csv.header.user',
  };
  const headersPasswords = {
    name: 'csv.header.passcodeName',
    // t: "インデックス",
    passwordID: 'csv.header.passcode',
  };
  console.log('pathname', pathname);
  var isPw = false;
  let newList = list.map((item) => {
    let headers;
    let newItem = {};

    if (pathname === PATHS.members.group) {
      headers = headersUserGroup;
    } else if (pathname === PATHS.doors.group) {
      headers = headersDeviceGroup;
    } else if (pathname === PATHS.members.list || pathname === PATHS.members.groupItem) {
      headers = headersUser;
    } else if (pathname === PATHS.doors.list) {
      headers = headersDevice;
      if (item.stateInfo?.batteryPercentage) {
        item.battery = item.stateInfo?.batteryPercentage;
      }
    } else if (pathname === PATHS.doors.item || pathname === PATHS.accessControl.region) {
      headers = headersDeviceHistory;
      item = processDeviceHistoryItem(item);
    } else if (pathname === PATHS.doors.groupItem) {
      headers = headersDevice2;
    } else if (pathname === PATHS.accessControl.index) {
      headers = headersCfpDevice;
    } else if (pathname === PATHS.accessControl.cards || pathname === PATHS.cards.index) {
      headers = headersCfpCards;
      if (item.hasOwnProperty('uuids') && Array.isArray(item.uuids)) {
        // 有含'cus_'的數據不要顯示
        const filteredUuids = item.uuids.filter((uuid) => !uuid.startsWith('cus_'));
        item.uuids = filteredUuids;
      }
    } else if (pathname === '/biz/access-control/fingers') {
      headers = headersFingers;
    } else if (pathname === PATHS.accessControl.passwords) {
      isPw = true;
      headers = headersPasswords;
    } else {
      console.log('no setting pathname downloadLists');
    }

    // 根據標題建立新項目
    Object.keys(headers).forEach((key) => {
      const label = i18n.t(headers[key]);
      if (item.hasOwnProperty(key)) {
        if (key === 'passwordID' && isPw) {
          newItem[label] = gUtils.binaryToDecimal(item[key]);
        } else {
          newItem[label] = item[key];
        }
      } else {
        newItem[label] = '';
      }
    });

    console.log('newItem', newItem);

    return newItem;
  });
  if (isCsv) {
    const csvHeaders = newList.length > 0 ? Object.keys(newList[0]) : [];

    const csv = Papa.unparse({
      fields: csvHeaders,
      data: newList,
      header: true,
      skipEmptyLines: true,
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${fileName}.csv`);
  } else {
    downloadExcel(newList, pathname, fileName);
  }
  // 取得第一項的標題並當成CSV標題
}

const downloadExcel = (data, pathname, fileName = 'sesamebiz') => {
  let processedData = {};
  if (pathname === PATHS.accessControl.cards || pathname === PATHS.cards.index) {
    const authDevices = i18n.t('csv.header.authDevices');
    processedData = data.map((item) => ({
      ...item,

      [authDevices]: Array.isArray(item[authDevices]) ? item[authDevices].join(', ') : item[authDevices],
    }));
  } else {
    processedData = data.map((item) => ({
      ...item,
    }));
  }

  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(processedData);

  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // 生成 Excel 文件并触发下载
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
export const csvUtils = {
  downloadCsv,
  downloadLists,
  downloadExcelTemp,
  importFields,
  normalizeCsvRows,
};
