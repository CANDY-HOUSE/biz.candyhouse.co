// Only complete, contiguous pages may become an authoritative device snapshot.
export function createDevicePageCollector() {
  let pages = null;
  return ({ list, page, totalPage }) => {
    if (
      !Array.isArray(list) ||
      !Number.isInteger(page) ||
      !Number.isInteger(totalPage) ||
      page < 1 ||
      page > totalPage
    ) {
      pages = null;
      return null;
    }
    if (page === 1) pages = { next: 1, total: totalPage, items: [] };
    if (!pages || pages.next !== page || pages.total !== totalPage) {
      pages = null;
      return null;
    }
    pages.items.push(...list);
    pages.next += 1;
    if (page !== totalPage) return null;
    const complete = pages.items;
    pages = null;
    const ids = complete.map((item) => item?.deviceUUID?.toUpperCase());
    return ids.every(Boolean) && new Set(ids).size === ids.length ? complete : null;
  };
}
