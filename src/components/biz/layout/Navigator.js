import { URLs } from '@constants/URLs';
import { MENU, PATHS, pageNames } from '@/routes/manifest';
import { Box, List } from '@mui/material';
import { ios } from '@/theme/appHomeStyle';
import { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '../../../context/GlobalContextProvider';
import { NavigatorItem, NavigatorItemTop } from './Navigatoritem';

export default function Navigator({ location, onClick }) {
  const { t } = useTranslation();
  const { gStripe } = useContext(GlobalStateContext);
  const { customerInfo } = gStripe;
  const { isSesameApp } = customerInfo;

  const renderCategories = useMemo(() => {
    const access = Array.isArray(customerInfo.access) ? customerInfo.access : [];
    const processedAccess = access.flatMap((item) =>
      item === pageNames.devices ? [pageNames.ssmDevices, pageNames.touchDevices] : item
    );
    const routerParams = processedAccess
      .map((id) => MENU.find((entry) => pageNames[entry.access] === id))
      .filter(Boolean)
      .map(({ access, items, router, icon }) => ({
        id: pageNames[access],
        items: items?.map((item) => ({ id: pageNames[item.access], router: item.router })),
        router,
        icon,
        onClick,
      }));
    const devIndex = routerParams.findIndex((item) => item.id === pageNames.developer);
    return devIndex === -1 ? [routerParams, []] : [routerParams.slice(0, devIndex), routerParams.slice(devIndex)];
  }, [customerInfo, onClick]);

  const renderCategoryItems = (categories) =>
    categories.map(({ id, items, router, icon }) => (
      <Box key={id}>
        <NavigatorItemTop items={items} id={id} icon={icon} router={router} onClick={onClick} />
      </Box>
    ));

  return (
    <List
      disablePadding
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        color: ios.label,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px',
        py: '8px',
        px: '12px',
      }}
    >
      <Box>
        {!isSesameApp && (
          <NavigatorItem
            to={PATHS.bizHome}
            name={t('navigator.Home')}
            icon="home"
            location={location}
            onClick={onClick}
          />
        )}
        {renderCategoryItems(renderCategories[0])}
      </Box>
      <Box>
        {renderCategoryItems(renderCategories[1])}
        {!isSesameApp && (
          <NavigatorItem
            to={URLs.intro}
            name={t('navigator.Support')}
            icon="support"
            external={true}
            location={location}
            onClick={onClick}
          />
        )}
        <NavigatorItem
          to={PATHS.settings}
          name={t('navigator.Settings')}
          icon="settings"
          location={location}
          onClick={onClick}
        />
      </Box>
    </List>
  );
}
