import React, { useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalContextProvider, { GlobalStateContext } from './context/GlobalContextProvider';
import theme from './theme/theme';
import './styles/global.css';
import './i18n';
import LoginIndex from '@pages/login';
import Layout from '@components/biz/layout';
import HomePage from '@pages/index';
import { gUtils } from '@/utils/gUtils';
import NotFoundPage from '@pages/404';
import LoadingPage from '@components/biz/layout/Auth/LoadingPage';
import { Amplify } from '@aws-amplify/core';
import awsconfig from './aws-exports';
import { routerComponentMap } from './router_config';
import Settings from '@biz/settings';
import BizHomePage from '@biz/home';

Amplify.configure(awsconfig);

const AppContent = () => {
  const { gStripe } = useContext(GlobalStateContext);
  const [allowedRoutes, setAllowedRoutes] = useState([]);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const loginInfo = gStripe.customerInfo;
    if (loginInfo && loginInfo.access?.length > 0) {
      const allowed = gUtils.categoriesConf.map(({ router, id, _items }) => {
        if (gUtils.isContainPage(gStripe.customerInfo.access, id, gStripe.customerInfo.isSesameApp)) {
          return router.startsWith('/biz/access-control') ? '/biz/access-control' : router;
        }
        return null;
      });
      allowed.push(...routerComponentMap.filter((it) => !!it.load));
      setAllowedRoutes(allowed.filter(Boolean));
    }
  }, [gStripe.customerInfo]);

  const getRoute = (router) => {
    if (Array.isArray(router)) {
      return router.map((routeItem) => {
        return getRoute(routeItem);
      });
    } else {
      const route = routerComponentMap.find((item) => item.router === router) ?? router;
      if (route && route.components) {
        return (
          <Route key={route.router} path={route.router}>
            {getRoute(route.components)}
          </Route>
        );
      }
      return <Route key={route.router} path={route.router} element={<route.component />}></Route>;
    }
  };

  const generateRoutes = (routes) => {
    if (!Array.isArray(routes) || routes.length === 0) {
      return;
    }
    return routes.map((route) => {
      return getRoute(route);
    });
  };

  if (gStripe.isPending) {
    return <LoadingPage />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginIndex />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/biz" element={<BizHomePage />} />
        {generateRoutes(allowedRoutes)}
        <Route path="/biz/settings" element={<Settings />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <GlobalContextProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppContent />
        </ThemeProvider>
      </GlobalContextProvider>
    </Router>
  );
};

export default App;
