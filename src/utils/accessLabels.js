import { useTranslation } from 'react-i18next';
import { pageNames } from '@/routes/manifest';

const accessKeys = Object.fromEntries(Object.entries(pageNames).map(([key, id]) => [id, key]));
const roleKeys = { オーナー: 'owner', マネージャー: 'manager', ゲスト: 'guest' };

// Permission IDs and built-in role names are stored values in Japanese; only their display is translated.
export const accessLabel = (t, id) => (accessKeys[id] ? t(`access.${accessKeys[id]}`) : id);
export const roleLabel = (t, tag) => (roleKeys[tag] ? t(`deviceMember.role.${roleKeys[tag]}`) : tag);

export function AccessLabel({ id }) {
  const { t } = useTranslation();
  return accessLabel(t, id);
}

export function RoleLabel({ tag }) {
  const { t } = useTranslation();
  return roleLabel(t, tag);
}
