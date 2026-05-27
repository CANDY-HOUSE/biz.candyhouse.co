import { gUtils } from '@/utils/gUtils';
import { URLs } from '@constants/URLs';
import { Box, List } from '@mui/material';
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
    const { access } = customerInfo;
    const { categoriesConf, pageNames } = gUtils;
    const processedAccess = access.flatMap((item) =>
      item === pageNames.devices ? [pageNames.ssmDevices, pageNames.touchDevices] : item
    );
    const routerParams = processedAccess
      .map((id) => categoriesConf.find((cat) => cat.id === id))
      .filter(Boolean)
      .map(({ id, items, router }) => ({ id, items, router, onClick }));
    const devIndex = routerParams.findIndex((item) => item.id === pageNames.developer);
    return devIndex === -1 ? [routerParams, []] : [routerParams.slice(0, devIndex), routerParams.slice(devIndex)];
  }, [customerInfo, onClick]);

  const renderCategoryItems = (categories) =>
    categories.map(({ id, items, router }) => (
      <Box key={id}>
        <NavigatorItemTop items={items} id={id} router={router} onClick={onClick} />
      </Box>
    ));

  return (
    <List
      disablePadding
      sx={{
        height: '100dvh',
        color: '#111111',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        py: '10px',
        pl: '16px',
      }}
    >
      <Box>
        {!isSesameApp && <NavigatorItem to="/biz" name={t('navigator.Home')} location={location} onClick={onClick} />}
        {renderCategoryItems(renderCategories[0])}
      </Box>
      <Box>
        {renderCategoryItems(renderCategories[1])}
        {!isSesameApp && (
          <NavigatorItem
            to={URLs.intro}
            name={t('navigator.Support')}
            external={true}
            location={location}
            onClick={onClick}
          />
        )}
        <NavigatorItem to="/biz/settings" name={t('navigator.Settings')} location={location} onClick={onClick} />
      </Box>
    </List>
  );
}
