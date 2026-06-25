import { saveAs } from 'file-saver';
import Papa from 'papaparse';

export const yamatoHeaders = [
  'お客様管理番号半角英数字50文字',
  '送り状種類',
  'クール区分',
  '伝票番号 ※B2クラウドにて付与',
  '出荷予定日 半角10文字 ｢YYYY/MM/DD｣で入力してください。',
  'お届け予定日 半角10文字',
  '配達時間帯 半角4文字',
  'お届け先コード 半角英数字20文字',
  'お届け先電話番号 半角数字15文字ハイフン含む (※宅急便_必須項目) (※ＤＭ便_必須項目) (※ネコポス_必須項目)',
  'お届け先電話番号枝番 半角数字2文字',
  'お届け先郵便番号 半角数字8文字 ハイフンなし7文字も可 (※宅急便_必須項目) (※ＤＭ便_必須項目) (※ネコポス_必須項目)',
  'お届け先住所 全角/半角 都道府県（４文字） 市区郡町村（１２文字） 町・番地（１６文字）',
  'お届け先アパートマンション名 全角/半角 16文字/32文字',
  'お届け先会社・部門１ 全角/半角 25文字/50文字',
  'お届け先会社・部門２ 全角/半角 25文字/50文字',
  'お届け先名 全角/半角 16文字/32文字  (※宅急便_必須項目) (※ＤＭ便_必須項目) (※ネコポス_必須項目)',
  'お届け先名(ｶﾅ) 半角カタカナ 50文字',
  '敬称 全角/半角 2文字/4文字',
  'ご依頼主コード 半角英数字 20文字',
  'ご依頼主電話番号 半角数字15文字ハイフン含む',
  'ご依頼主電話番号枝番 半角数字 2文字',
  'ご依頼主郵便番号 半角数字8文字 ハイフンなし半角7文字も可',
  'ご依頼主住所 全角/半角32文字/64文字 都道府県（４文字） 市区郡町村（１２文字） 町・番地（１６文字） (※宅急便_必須項目) (※ネコポス_必須項目)',
  'ご依頼主アパートマンション 全角/半角 16文字/32文字',
  'ご依頼主名 全角/半角 16文字/32文字  (※宅急便_必須項目) (※ネコポス_必須項目)',
  'ご依頼主名(ｶﾅ) 半角カタカナ 50文字',
  '品名コード１ 半角英数字 30文字',
  '品名１ 全角/半角 25文字/50文字',
  '品名コード２ 半角英数字 30文字',
  '品名２ 全角/半角 25文字/50文字',
  '荷扱い１ 全角/半角 10文字/20文字',
  '荷扱い２ 全角/半角 10文字/20文字',
  '記事 全角/半角 22文字/44文字',
  'ｺﾚｸﾄ代金引換額（税込) 半角数字 7文字',
  '内消費税額等 半角数字 7文字',
  '止置き 半角数字 1文字 0 : 利用しない 1 : 利用する',
  '営業所コード 半角数字 6文字',
  '発行枚数 半角数字 2文字',
  '個数口表示フラグ 半角数字 1文字',
  '請求先顧客コード 半角数字12文字',
  '請求先分類コード 空白または半角数字3文字',
  '運賃管理番号',
  'クロネコwebコレクトデータ登録',
  'クロネコwebコレクト加盟店番号',
  'クロネコwebコレクト申込受付番号１',
  'クロネコwebコレクト申込受付番号２',
  'クロネコwebコレクト申込受付番号３',
  'お届け予定ｅメール 1 : 利用する',
  'お届け予定ｅメールe-mailアドレス 半角英数字＆記号 60文字 ※お届け予定eメールを利用する場合は必須 ',
  '入力機種',
  'お届け予定ｅメールメッセージ 全角 74文字',
  'お届け完了ｅメール利用区分 半角数字 1文字 0 : 利用しない 1 : 利用する',
  'お届け完了ｅメールe-mailアドレス',
  'お届け完了ｅメールメッセージ 全角 159文字',
  'クロネコ収納代行利用区分 半角数字１文字',
  '予備 半角数字１文字',
  '収納代行請求金額(税込) 半角数字７文字',
  '収納代行内消費税額等 半角数字７文字',
  '収納代行請求先郵便番号 半角数字＆ハイフン8文字',
  '収納代行請求先住所',
  '収納代行請求先住所（アパートマンション名）全角/半角　16文字/32文字',
  '収納代行請求先会社・部門名１ 全角/半角　25文字/50文字',
  '収納代行請求先会社・部門名２ 全角/半角　25文字/50文字',
  '収納代行請求先名(漢字) 全角/半角　16文字/32文字',
  '収納代行請求先名(カナ) 半角カタカナ50文字',
  '収納代行問合せ先名(漢字) 全角/半角　16文字/32文字',
  '収納代行問合せ先郵便番号 半角数字＆ハイフン8文字',
  '収納代行問合せ先住所 全角/半角　32文字/64文字',
  '収納代行問合せ先住所（アパートマンション名）',
  '収納代行問合せ先電話番号 半角数字＆ハイフン15文字',
  '収納代行管理番号 半角英数字20文字',
  '収納代行品名 全角/半角　25文字/50文字',
  '収納代行備考 全角/半角　14文字/28文字',
  '複数口くくりキー 半角英数字20文字',
  '検索キータイトル1',
  '検索キー1 半角英数字 20文字',
  '検索キータイトル2',
  '検索キー2 半角英数字 20文字',
  '検索キータイトル3 全角/半角 10文字/20文字',
  '検索キー3 半角英数字 20文字',
  '検索キータイトル4 全角/半角 10文字/20文字',
  '検索キー4 半角英数字 20文字',
  '検索キータイトル5',
  '検索キー5',
  '予備',
  '予備',
  '投函予定メール利用区分 半角数字',
  '投函予定メールe-mailアドレス 半角英数字＆記号 60文字',
  '投函予定メールメッセージ',
  '投函完了メール（お届け先宛）',
  '投函完了メール（お届け先宛）e-mailアドレス 半角英数字＆記号 60文字',
  '投函完了メール（お届け先宛）メールメッセージ 全角/半角 159文字/318文字 ※半角カタカナ及び半角スペースは使えません。',
  '投函完了メール（ご依頼主宛）利用区分 半角数字 1文字 0 : 利用しない 1 : 利用する PC宛て',
  '投函完了メール（ご依頼主宛）e-mailアドレス 半角英数字＆記号 60文字',
  '投函完了メール（ご依頼主宛）メールメッセージ 全角/半角 159文字/318文字',
];

export const downloadCsv = (rows, filename, headers) => {
  const data = headers
    ? rows.map((row) =>
        headers.reduce((acc, header) => {
          acc[header] = row[header] ?? '';
          return acc;
        }, {})
      )
    : rows;
  const csv = Papa.unparse(data, headers ? { columns: headers } : undefined);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename);
};

const cleanShopifyEmptyColumn = (obj) => {
  for (const propName in obj) {
    if (obj[propName] === '' || obj[propName] === undefined) {
      delete obj[propName];
    }
  }
  return obj;
};

const isYamatoShipping = (method = '') => method.includes('ヤマト') || method.includes('配送');

const yamatoB2CSV = (shopifyData) => {
  const sortedData = [...shopifyData].sort((a, b) => {
    if (a['Lineitem sku'] < b['Lineitem sku']) return 1;
    if (a['Lineitem sku'] > b['Lineitem sku']) return -1;
    return 1;
  });

  const yamaHeader = sortedData.map((row) => {
    const address = (row['Shipping Street'] || '').replaceAll(' ', '').replaceAll(',', '').replaceAll('\u3000', '');
    return {
      お客様管理番号半角英数字50文字: row.Name,
      '記事 全角/半角 22文字/44文字': row.Name,
      送り状種類: row['Shipping Method'],
      品名: `${row['Lineitem sku']}x${row['Lineitem quantity']}`,
      'お届け先電話番号 半角数字15文字ハイフン含む (※宅急便_必須項目) (※ＤＭ便_必須項目) (※ネコポス_必須項目)':
        row['Shipping Phone'],
      'お届け先郵便番号 半角数字8文字 ハイフンなし7文字も可 (※宅急便_必須項目) (※ＤＭ便_必須項目) (※ネコポス_必須項目)':
        row['Shipping Zip'],
      'お届け先住所 全角/半角 都道府県（４文字） 市区郡町村（１２文字） 町・番地（１６文字）':
        (row['Shipping Province Name'] || '') +
        (row['Shipping City'] || '').replaceAll(' ', '').replace('N/A', '') +
        address.substring(0, 16),
      'お届け先アパートマンション名 全角/半角 16文字/32文字': address.substring(16, 32),
      'お届け先会社・部門１ 全角/半角 25文字/50文字': address.substring(32),
      'お届け先会社・部門２ 全角/半角 25文字/50文字': row['Shipping Company'],
      'お届け先名 全角/半角 16文字/32文字  (※宅急便_必須項目) (※ＤＭ便_必須項目) (※ネコポス_必須項目)':
        row['Shipping Name'] || '',
    };
  });

  const yamatoPhoneDeliveryEdit = yamaHeader.map((item) => {
    const phoneKey =
      'お届け先電話番号 半角数字15文字ハイフン含む (※宅急便_必須項目) (※ＤＭ便_必須項目) (※ネコポス_必須項目)';
    if (item[phoneKey]) {
      item[phoneKey] = item[phoneKey]
        .replaceAll('+81', '0')
        .replaceAll('+80', '0')
        .replaceAll('+86', '0')
        .replace(/[^\d]/g, '');
    }
    if (item['送り状種類']) {
      item['送り状種類'] = 8;
    }
    return item;
  });

  const yamatoProductEdit = yamatoPhoneDeliveryEdit.reduce((acc, item) => {
    const existing = acc.find((a) => a['お客様管理番号半角英数字50文字'] === item['お客様管理番号半角英数字50文字']);
    if (existing) existing['品名'] = `${existing['品名']} ${item['品名']}`;
    else acc.push(item);
    return acc;
  }, []);

  return yamatoProductEdit.map((item) => ({
    ...item,
    '品名１ 全角/半角 25文字/50文字': item['品名'].substring(0, 25),
    '品名２ 全角/半角 25文字/50文字': item['品名'].substring(25),
    '出荷予定日 半角10文字 ｢YYYY/MM/DD｣で入力してください。': new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
    'ご依頼主電話番号 半角数字15文字ハイフン含む': '0',
    'ご依頼主郵便番号 半角数字8文字 ハイフンなし半角7文字も可': '104-0042',
    'ご依頼主住所 全角/半角32文字/64文字 都道府県（４文字） 市区郡町村（１２文字） 町・番地（１６文字） (※宅急便_必須項目) (※ネコポス_必須項目)':
      '東京都中央区入船１−９−８',
    'ご依頼主アパートマンション 全角/半角 16文字/32文字': 'ピエノアーク入船５階',
    'ご依頼主名 全角/半角 16文字/32文字  (※宅急便_必須項目) (※ネコポス_必須項目)': 'CANDY HOUSE, Inc.',
    '荷扱い１ 全角/半角 10文字/20文字': '精密機器',
    '荷扱い２ 全角/半角 10文字/20文字': '下積厳禁',
    '請求先顧客コード 半角数字12文字': '08039113625',
    運賃管理番号: '01',
    'お届け予定ｅメール 1 : 利用する': '0',
    入力機種: '0',
  }));
};

export const shopifyCSV2ShippingCSV = (csvData) => {
  csvData.forEach((item) => cleanShopifyEmptyColumn(item));
  const orderEdit = csvData.reduce((acc, item) => {
    const findSameShopifyNum = acc.find((order) => order.Name === item.Name);
    acc.push(findSameShopifyNum ? { ...findSameShopifyNum, ...item } : item);
    return acc;
  }, []);

  const notRefundData = orderEdit.filter((row) => row['Financial Status'] !== 'refunded');
  const notRefundWarrantyTransfer = notRefundData.filter(
    (row) =>
      row['Lineitem sku'] !== '保証外修理サービス' &&
      row['Lineitem name'] !== '特別取扱手数料' &&
      row['Shipping Method'] !== undefined
  );
  const todayShipping = notRefundWarrantyTransfer.filter(
    (row) =>
      row['Lineitem fulfillment status'] === 'pending' &&
      (row['Shipping Method'].includes('ヤマト') ||
        row['Shipping Method'].includes('送料') ||
        row['Shipping Method'].includes('配送')) &&
      row['Lineitem sku'] !== '特ｱﾀﾞ_オダ' &&
      row['Lineitem sku'] !== 'カスタマイズアダプター' &&
      row['Lineitem sku'] !== '保証外修理サービス' &&
      !row['Lineitem name']?.includes('テスト') &&
      row['Lineitem price'] !== '0' &&
      row['Outstanding Balance'] === '0' &&
      row['Cancelled at'] === undefined
  );
  const exception = notRefundWarrantyTransfer.filter((row) => row['Lineitem sku'] === '特殊アダプター');
  const orderChanged = notRefundWarrantyTransfer.filter((row) => row['Outstanding Balance'] !== '0');
  const orderChangedList = orderChanged.reduce((acc, current) => {
    return acc.some((item) => item.Name === current.Name) ? acc : acc.concat([current]);
  }, []);
  const inStock = todayShipping.map((row) => ({
    product: row['Lineitem sku'],
    productAmount: Number(row['Lineitem quantity']),
  }));
  const inStockData = inStock
    .reduce((acc, item) => {
      const existing = acc.find((a) => a.product === item.product);
      if (existing) existing.productAmount += item.productAmount;
      else acc.push(item);
      return acc;
    }, [])
    .sort((a, b) => {
      if (a.product < b.product) return 1;
      if (a.product > b.product) return -1;
      return 1;
    });

  return [yamatoB2CSV(todayShipping), inStockData, exception, orderChangedList];
};

// アップロードをしたデータの中で、ステータスが「未発送」の注文をすべてYamato CSVに変換する内容に変更。
export const checkRange = (csvData) => {
  const sortedData = csvData
    .map((row) => ({
      ...row,
      name1: Number(row.Name.substring(3)),
    }))
    .sort((a, b) => b.name1 - a.name1);
  // .map((row) => ({ ...row, name1: Number(row.Name.substring(3)) }))
  // .sort((a, b) => {
  //   if (a.name1 < b.name1) return 1;
  //   if (a.name1 > b.name1) return -1;
  //   return 1;
  // });

  // データの中から、Yamato配送が始まる位置を見つけるために入れていた。
  // const csvDataStart = sortedData.findIndex((item) => isYamatoShipping(item['Shipping Method']));
  // const targetData = csvDataStart >= 0 ? sortedData.slice(csvDataStart) : sortedData;

  // const afterCheckAndSortData = [];
  // for (const item of targetData) {
  //   const shippedPartialYamato =
  //     item['Fulfillment Status'] === 'partial' &&
  //     item['Lineitem fulfillment status'] === 'fulfilled' &&
  //     isYamatoShipping(item['Shipping Method']);
  //   const fulfilledYamato = item['Fulfillment Status'] === 'fulfilled' && isYamatoShipping(item['Shipping Method']);
  //   if (shippedPartialYamato || fulfilledYamato) break;
  //   afterCheckAndSortData.push(item);
  // }

  const afterCheckAndSortData = sortedData.filter((item) => {
    const fulfillmentStatus = String(item['Fulfillment Status'] || '').toLowerCase();
    const lineitemStatus = String(item['Lineitem fulfillment status'] || '').toLowerCase();

    const isYamato = isYamatoShipping(item['Shipping Method']);

    const isUnfulfilled = fulfillmentStatus === 'unfulfilled' || fulfillmentStatus === '未発送';

    // const isPartialUnfulfilled = fulfillmentStatus === 'partial' && lineitemStatus !== 'fulfilled';

    return isYamato && isUnfulfilled;
    // return isYamato && (isUnfulfilled || isPartialUnfulfilled);
  });

  return [
    // targetData[0]?.Name ?? '',
    afterCheckAndSortData[0]?.Name ?? '',
    afterCheckAndSortData[afterCheckAndSortData.length - 1]?.Name ?? '',
    afterCheckAndSortData,
  ];
};

const REPAIR_SENDER = {
  phone: '0',
  zip: '104-0042',
  address: '東京都中央区入船１−９−８',
  building: 'ピエノアーク入船５階',
  name: 'CANDY HOUSE, Inc.',
  customerCode: '08039113625',
};

export const initialRepairTableData = {
  ticket: '',
  mobile: '',
  zip: '',
  address: '',
  addressDetail: '',
  name: '',
  products: '',
  otherProducts: '',
};

const fetchFreshdeskJson = async (url, authorizationKey) => {
  const response = await fetch(url, { headers: { Authorization: authorizationKey } });
  if (!response.ok) {
    throw new Error(`Freshdesk request failed: ${response.status}`);
  }
  return response.json();
};

const buildRepairRow = ({ ticket, ticketInfo, customerInfo, recipientName }) => ({
  お客様管理番号半角英数字50文字: ticket,
  送り状種類: '8',
  '出荷予定日 半角10文字 ｢YYYY/MM/DD｣で入力してください。': new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
  'お届け先電話番号 半角数字15文字ハイフン含む (※宅急便_必須項目) (※ＤＭ便_必須項目) (※ネコポス_必須項目)':
    ticketInfo.requester.mobile,
  'お届け先郵便番号 半角数字8文字 ハイフンなし7文字も可 (※宅急便_必須項目) (※ＤＭ便_必須項目) (※ネコポス_必須項目)':
    customerInfo.custom_fields.rand456254,
  'お届け先住所 全角/半角 都道府県（４文字） 市区郡町村（１２文字） 町・番地（１６文字）':
    customerInfo.custom_fields.test,
  'お届け先アパートマンション名 全角/半角  16文字/32文字': customerInfo.custom_fields.rand836477,
  'お届け先名 全角/半角 16文字/32文字  (※宅急便_必須項目) (※ＤＭ便_必須項目) (※ネコポス_必須項目)': recipientName,
  'ご依頼主電話番号 半角数字15文字ハイフン含む': REPAIR_SENDER.phone,
  'ご依頼主郵便番号 半角数字8文字 ハイフンなし半角7文字も可': REPAIR_SENDER.zip,
  'ご依頼主住所 全角/半角32文字/64文字 都道府県（４文字） 市区郡町村（１２文字） 町・番地（１６文字） (※宅急便_必須項目) (※ネコポス_必須項目)':
    REPAIR_SENDER.address,
  'ご依頼主アパートマンション 全角/半角 16文字/32文字': REPAIR_SENDER.building,
  'ご依頼主名 全角/半角 16文字/32文字  (※宅急便_必須項目) (※ネコポス_必須項目)': REPAIR_SENDER.name,
  '品名１ 全角/半角 25文字/50文字': `${ticket}:${ticketInfo.custom_fields.cf_test_products}`,
  '品名２ 全角/半角 25文字/50文字': ticketInfo.custom_fields.cf_testproducts,
  '荷扱い１ 全角/半角 10文字/20文字': '精密機器',
  '荷扱い２ 全角/半角 10文字/20文字': '下積厳禁',
  '請求先顧客コード 半角数字12文字': REPAIR_SENDER.customerCode,
  運賃管理番号: '01',
  'お届け予定ｅメール 1 : 利用する': '0',
  入力機種: '0',
});

export const fetchRepairData = async (ticket, authorizationKey) => {
  const ticketInfo = await fetchFreshdeskJson(
    `https://candyhouseinc.freshdesk.com/api/v2/tickets/${ticket}?include=requester`,
    authorizationKey
  );
  const customerInfo = await fetchFreshdeskJson(
    `https://candyhouseinc.freshdesk.com/api/v2/contacts/${ticketInfo.requester.id}`,
    authorizationKey
  );
  const recipientName =
    customerInfo.custom_fields.rand85614 === null ? customerInfo.name : customerInfo.custom_fields.rand85614;

  return {
    row: buildRepairRow({ ticket, ticketInfo, customerInfo, recipientName }),
    tableData: {
      ticket,
      mobile: ticketInfo.requester.mobile,
      zip: customerInfo.custom_fields.rand456254,
      address: customerInfo.custom_fields.test,
      addressDetail: customerInfo.custom_fields.rand836477,
      name: recipientName,
      products: ticketInfo.custom_fields.cf_test_products,
      otherProducts: ticketInfo.custom_fields.cf_testproducts,
    },
  };
};
