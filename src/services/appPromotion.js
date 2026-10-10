import { appOperation } from './appOperations';

let promotion = null;
let revision = 0;
const listeners = new Set();
const update = (value) => {
  promotion = value;
  listeners.forEach((listener) => listener());
};
export const appPromotion = {
  getSnapshot: () => promotion,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  clear() {
    revision++;
    update(null);
  },
  async refresh(account) {
    const request = ++revision;
    const result = await appOperation('getActivePromotion', {}, { account });
    if (result?.success && request === revision) update(result.promotion);
    return promotion;
  },
  async markRead(promotionId, targetUrl) {
    const request = ++revision;
    if (promotion?.promotionId === promotionId) update({ ...promotion, visible: false });
    const result = await appOperation('markPromotionRead', { promotionId, targetUrl });
    if (result?.success && request === revision) update(result.promotion);
    return promotion;
  },
};
