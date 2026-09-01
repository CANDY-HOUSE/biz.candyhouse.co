import { useCallback, useContext, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { gUtils } from '@/utils/gUtils';

// 后端已按 cardID 去重，一页 500 张卡约 46KB，远低于 API Gateway 单条消息 128KB 的上限
const PAGE_SIZE = 500;
// 兜底：后端 lastKey 万一不收敛，也不要无限翻页
const MAX_PAGES = 100;
const RESPONSE_TIMEOUT_MS = 30000;

// 与页面上另一组「当前列表」下载按钮区分开：文件名带 all-history 标志 + 设备 UUID + 导出时刻
const buildFileName = (stpDeviceUUID) => {
  const now = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}` +
    `-${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`;
  return `sesamebiz_all-history_${stpDeviceUUID}_${stamp}`;
};

// 去重主要在后端做（nfc_card 每次改名/登録都新增一条，实测 10 倍冗余）。
// 这里再去一次是兜底：后端按 offset 分页，万一翻页期间有新记录写入导致偏移，
// 也不会把同一张卡导出两遍。
const dedupeByCard = (rows) => {
  const cardMap = new Map();
  rows.forEach((row) => {
    if (!row) {
      return;
    }
    const key = (row.cardID || row.cardNameUUID || '').toUpperCase();
    if (!key) {
      return;
    }
    const prev = cardMap.get(key);
    if (!prev || (row.timestamp || 0) >= (prev.timestamp || 0)) {
      cardMap.set(key, row);
    }
  });
  return Array.from(cardMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

/**
 * 导出某台 stpDevice 上曾经用过的全部卡片。
 *
 * 数据来自 nfc_card 表（GSI: stpDeviceUUID），这张表只写不删，
 * 所以能拿到设备上曾经登録过的卡片；页面表格里那份来自 candyhouse_sesame_card，
 * 会被 clearCards / delCards 清掉，只反映设备当前的卡片。
 */
export default function useStpDeviceCardsExport() {
  const { gManageAuthData } = useContext(GlobalStateContext);
  const [isExporting, setIsExporting] = useState(false);

  const fetchPage = useCallback(
    (stpDeviceUUID, lastKey) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('getCardsByStpDevice timeout'));
        }, RESPONSE_TIMEOUT_MS);
        gManageAuthData.getCardsByStpDevice({ stpDeviceUUID, lastKey, pageSize: PAGE_SIZE }, (resp) => {
          clearTimeout(timer);
          resolve(resp);
        });
      }),
    [gManageAuthData]
  );

  const fetchAllCards = useCallback(
    async (stpDeviceUUID) => {
      const rows = [];
      let lastKey = null;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const resp = await fetchPage(stpDeviceUUID, lastKey);
        // 后端统一用 tx() 回包：{ action, op, code, data, message, success, reqContext }
        if (resp?.success === false) {
          throw new Error(resp.message || 'getCardsByStpDevice failed');
        }
        const list = resp?.data?.list || [];
        rows.push(...list);
        lastKey = resp?.data?.lastKey || null;
        if (!lastKey) {
          break;
        }
      }
      return rows;
    },
    [fetchPage]
  );

  /**
   * @returns {Promise<number>} 实际导出的卡片数；为 0 时不会触发下载
   */
  const exportCards = useCallback(
    async (stpDeviceUUID, isCsv = true) => {
      if (!stpDeviceUUID || isExporting) {
        return 0;
      }
      setIsExporting(true);
      try {
        const rows = await fetchAllCards(stpDeviceUUID);
        // 这里查的就是该设备索引下的记录，認証機器 一列固定为当前设备
        const list = dedupeByCard(rows).map((item) => ({ ...item, uuids: [stpDeviceUUID] }));
        if (list.length < 1) {
          return 0;
        }
        gUtils.csvUtils.downloadLists(list, isCsv, buildFileName(stpDeviceUUID));
        return list.length;
      } finally {
        setIsExporting(false);
      }
    },
    [fetchAllCards, isExporting]
  );

  return { isExporting, exportCards };
}
