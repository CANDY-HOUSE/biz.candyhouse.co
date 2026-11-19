import { useTranslation } from 'react-i18next';

/** 把 lastSeenAt 说成人话。Vision 首页卡片和详情页的「观看实时画面」按钮只要"多久以前"，不需要精确时刻。 */
export const useRelativeTime = () => {
  const { t } = useTranslation();
  return (ms) => {
    if (!ms) return '';
    const diff = Date.now() - ms;
    if (diff < 60_000) return t('face3.justNow');
    if (diff < 3600_000) return t('face3.minutesAgo', { n: Math.floor(diff / 60_000) });
    if (diff < 86400_000) return t('face3.hoursAgo', { n: Math.floor(diff / 3600_000) });
    return t('face3.daysAgo', { n: Math.floor(diff / 86400_000) });
  };
};
