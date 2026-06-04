import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { gUtils } from './gUtils';
// import { useLocation } from 'react'
import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';
import { wordConfig } from '@constants/wordConfig';

function processDeviceHistoryItem(item) {
  const processedItem = { ...item };
  let status = processedItem.type;
  switch (status) {
    case 1:
    case 6:
    case 7:
    case 14:
    case 16:
      processedItem.type = '施錠';
      break;
    case 2:
    case 8:
    case 15:
    case 17:
      processedItem.type = '解錠';
      break;
    case 18:
    case 19:
    case 20:
      processedItem.type = 'bot 施解錠';
      break;
    case 90:
      processedItem.type = '開';
      break;
    case 91:
      processedItem.type = '閉';
      break;
    default:
      processedItem.type = '';
  }
  if (processedItem.timestamp) {
    const time = processedItem.timestamp;
    processedItem.timestamp =
      new Date(time).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) +
      new Date(time).toLocaleTimeString('ja-JP', {
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
      processedItem.via = '手動';
      break;
    case 1:
    case 2:
    case 18:
    case 90:
    case 91:
      processedItem.via = 'Bluetooth';
      break;
    case 6:
      processedItem.via = 'オートロック';
      break;
    case 14:
    case 15:
    case 19:
      processedItem.via = 'WiFiモジュール';
      break;
    case 16:
    case 17:
    case 20:
      processedItem.via = 'web API';
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
    if (pathname === '/biz/employees/list') {
      data = [
        {
          ユーザー名: '',
          メールアドレス: '',
          '所属（任意）': '',
          '電話番号（任意）': '',
        },
      ];
    } else if (pathname === '/biz/access-control/cards' || pathname === '/biz/cards') {
      data = [
        {
          カード名: '',
          ID: '',
          ユーザー: '',
        },
      ];
    } else if (pathname === '/biz/access-control/passwords') {
      data = [
        {
          暗証番号名: '',
          暗証番号: '',
        },
      ];
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

function downloadLists(list, isCsv = true) {
  console.log('hey下载数据', list);

  // 定義各header
  const headersUserGroup = {
    name: 'グループ名',
    gid: 'UUID',
    uuids: '紐付けているユーザー',
  };
  const headersDeviceGroup = {
    name: 'グループ名',
    gid: 'UUID',
    uuids: '紐付けているデバイス',
  };
  const headersDeviceHistory = {
    type: '状態',
    timestamp: '時間',
    history_tag: 'ユーザー名',
    via: '操作方法',
  };
  const headersUser = {
    employeeName: 'ユーザー名',
    employeeEmail: 'メールアドレス',
    subUUID: 'サブUUID',
    tag: 'ロール',
    department: '所属（任意）',
    phone: '電話番号（任意）',
  };
  const headersDevice = {
    deviceName: 'デバイス名',
    deviceModel: 'モデル',
    deviceUUID: 'デバイスUUID',
    battery: '電池残量',
  };
  const headersDevice2 = {
    deviceName: 'デバイス名',
    deviceModel: 'モデル',
    deviceUUID: 'デバイスUUID',
    battery: '電池残量',
  };
  const headersCfpDevice = {
    deviceName: 'デバイス名',
    deviceModel: 'モデル',
    deviceUUID: 'デバイスUUID',
    battery: '電池残量',
    //  battery: "連携するセサミ",
  };
  const headersCfpCards = {
    name: 'カード名',
    cardID: 'ID',
    subUUID: 'ユーザー',
    uuids: '認証機器',
  };
  const headersFingers = {
    name: '指紋名',
    fingerID: 'ID',
    // id: "インデックス",
    memberName: 'ユーザー',
  };
  const headersPasswords = {
    name: '暗証番号名',
    // t: "インデックス",
    passwordID: '暗証番号',
  };
  const pathname = window.location.pathname;
  console.log('pathname', pathname);
  var isPw = false;
  let newList = list.map((item) => {
    let headers;
    let newItem = {};

    if (pathname === '/biz/employees/group') {
      headers = headersUserGroup;
    } else if (pathname === '/biz/devices/group') {
      headers = headersDeviceGroup;
    } else if (pathname === '/biz/employees/list' || pathname === '/biz/employees/group-item') {
      headers = headersUser;
    } else if (pathname === '/biz/devices/list') {
      headers = headersDevice;
      if (item.stateInfo?.batteryPercentage) {
        item.battery = item.stateInfo?.batteryPercentage;
      }
    } else if (pathname === '/biz/devices/list-item' || pathname === '/biz/access-control/region') {
      headers = headersDeviceHistory;
      item = processDeviceHistoryItem(item);
    } else if (pathname === '/biz/devices/group-item') {
      headers = headersDevice2;
    } else if (pathname === '/biz/access-control/index') {
      headers = headersCfpDevice;
    } else if (pathname === '/biz/access-control/cards' || pathname === '/biz/cards') {
      headers = headersCfpCards;
      if (item.hasOwnProperty('uuids') && Array.isArray(item.uuids)) {
        // 有含'cus_'的數據不要顯示
        const filteredUuids = item.uuids.filter((uuid) => !uuid.startsWith('cus_'));
        item.uuids = filteredUuids;
      }
    } else if (pathname === '/biz/access-control/fingers') {
      headers = headersFingers;
    } else if (pathname === '/biz/access-control/passwords') {
      isPw = true;
      headers = headersPasswords;
    } else {
      console.log('no setting pathname downloadLists');
    }

    // 根據標題建立新項目
    Object.keys(headers).forEach((key) => {
      if (item.hasOwnProperty(key)) {
        if (key === 'passwordID' && isPw) {
          newItem[headers[key]] = gUtils.binaryToDecimal(item[key]);
        } else {
          newItem[headers[key]] = item[key];
        }
      } else {
        newItem[headers[key]] = '';
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
    saveAs(blob, 'sesamebiz.csv');
  } else {
    downloadExcel(newList, pathname);
  }
  // 取得第一項的標題並當成CSV標題
}

const downloadExcel = (data, pathname) => {
  let processedData = {};
  if (pathname === '/access-control/cards' || pathname === '/cards') {
    processedData = data.map((item) => ({
      ...item,

      [wordConfig.touchCertEquipment]: Array.isArray(item.認証機器) ? item.認証機器.join(', ') : item.認証機器,
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
  XLSX.writeFile(workbook, 'sesamebiz.xlsx');
};
export const csvUtils = {
  downloadCsv,
  downloadLists,
  downloadExcelTemp,
};
