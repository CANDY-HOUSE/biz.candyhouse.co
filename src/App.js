import { gUtils } from '@/utils/gUtils';
import { Amplify } from '@aws-amplify/core';
import deferredComponent from './components/deferredComponent';
import Layout from '@components/biz/layout';
import LoadingPage from '@components/biz/layout/Auth/LoadingPage';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import NotFoundPage from '@pages/404';
import HomePage from '@pages/index';
import LoginIndex from '@pages/login';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import awsconfig from './aws-exports';
import GlobalContextProvider, { GlobalStateContext } from './context/GlobalContextProvider';
import './i18n';
import { routerComponentMap } from './router_config';
import './styles/global.css';
import NativePageTheme from './theme/NativePageTheme';
import AppPullRefresh from './components/AppPullRefresh';
import AppGuestGate from './components/AppGuestGate';
import { ContactsEmpty } from './components/MobileContactList';
import AppRegistration from './components/AppRegistration';
import AppBootstrap from './components/AppBootstrap';
import AppUpdateRuntime from './components/AppUpdateRuntime';
import AppStartupReady from './components/AppStartupReady';
import AppNavigation from './components/AppNavigation';
import AppTopBar from './components/AppTopBar';
import AppQrScanner from './components/AppQrScanner';
import AppInternalTest from './components/AppInternalTest';
import AppOfflineDevices, { AppOfflineStateContext } from './components/AppOfflineDevices';
import { currentAppToken } from './services/appSession';
import AppHomeRuntime from './components/AppHomeRuntime';
import AppLocationDisclosure from './components/AppLocationDisclosure';
import { isAppHome } from './services/deviceService';
// Face3 LiveKit 灰度开关：必须在路由跳转（会丢掉地址栏 ?lk=）之前读取。
import '@utils/face3LiveKitFlag';

const BizHomePage = deferredComponent(() => import('@biz/home'));
const Settings = deferredComponent(() => import('@biz/settings'));

Amplify.configure(awsconfig);

const AppContent = () => {
  const { gStripe, gManageDevice, gAuth } = useContext(GlobalStateContext);
  const { setDevices: clearStartupDevices } = useContext(AppOfflineStateContext);
  useEffect(() => {
    if (gManageDevice.devicesLoaded) clearStartupDevices(null);
  }, [gManageDevice.devicesLoaded, clearStartupDevices]);
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
      if (isAppHome) allowed.push('/contacts', '/me');
      allowed.push(...routerComponentMap.filter((it) => !!it.load));
      setAllowedRoutes([...new Set(allowed.filter(Boolean))]);
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
      return (
        <Route
          key={route.router}
          path={route.router}
          element={
            isAppHome && ['/contacts', '/contact-add'].includes(route.router) ? (
              <AppGuestGate fallback={route.router === '/contacts' ? <ContactsEmpty /> : null}>
                <route.component />
              </AppGuestGate>
            ) : (
              <route.component />
            )
          }
        ></Route>
      );
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

  if (isAppHome && !gManageDevice.devicesLoaded && location.pathname === '/') {
    return (
      <AppOfflineDevices
        retry={async () => {
          try {
            const token = await currentAppToken();
            gAuth.autoLogin(token);
            gStripe.getCustomerInfo('ch_CandyhouseMobile');
            if (gStripe.customerInfo.companyID) gManageDevice.getCompanyDevices(true);
          } catch (_) {
            /* Local BLE remains available when authentication cannot refresh. */
          }
        }}
      />
    );
  }

  if (isAppHome && !allowedRoutes.length && location.pathname !== '/login') return null;

  if (!isAppHome && gStripe.isPending) {
    return <LoadingPage />;
  }

  return (
    <>
      {isAppHome && <AppPullRefresh />}
      <Routes>
        <Route path="/login" element={<LoginIndex />} />
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          {isAppHome && <Route path="/app/register" element={<AppRegistration />} />}
          <Route path="/biz" element={<BizHomePage />} />
          {generateRoutes(allowedRoutes)}
          <Route path="/biz/settings" element={<Settings />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
};

// Keep the tab bar mounted while session and device data initialize.
const AppFrame = ({ children }) => {
  const location = useLocation();
  const contentRef = useRef(null);
  const homeScrollTop = useRef(0);
  useLayoutEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = location.pathname === '/' ? homeScrollTop.current : 0;
    }
  }, [location.pathname]);
  if (!isAppHome) return children;
  return (
    // Pages scroll inside the content box, never the document: the WebView moves even fixed elements while the
    // document scrolls, which drags the title bar along.
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppTopBar />
      <Box
        ref={contentRef}
        onScroll={(event) => {
          if (location.pathname === '/') homeScrollTop.current = event.currentTarget.scrollTop;
        }}
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          position: 'relative',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorX: 'none',
        }}
      >
        {children}
      </Box>
      {isAppHome && <AppNavigation />}
    </Box>
  );
};

const App = () => {
  return (
    <Router>
      <NativePageTheme>
        <CssBaseline />
        {isAppHome && (
          <GlobalStyles
            styles={{
              // Include dialogs rendered into body through portals; keep text editing available.
              body: { WebkitUserSelect: 'none', userSelect: 'none' },
              // The WebView's own overscroll stretch moves the whole page, title bar included.
              'html, body': { overscrollBehavior: 'none' },
              'input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]': {
                WebkitUserSelect: 'text',
                userSelect: 'text',
              },
            }}
          />
        )}
        <AppFrame>
          <AppStartupReady />
          <AppUpdateRuntime />
          {/* Outside AppBootstrap: the offline device list can trigger the first location prompt before it is ready. */}
          {isAppHome && <AppLocationDisclosure />}
          <AppBootstrap>
            <GlobalContextProvider>
              <AppHomeRuntime />
              <AppContent />
              {isAppHome && <AppQrScanner />}
              {isAppHome && <AppInternalTest />}
            </GlobalContextProvider>
          </AppBootstrap>
        </AppFrame>
      </NativePageTheme>
    </Router>
  );
};

export default App;
