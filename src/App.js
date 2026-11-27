import { gUtils } from '@/utils/gUtils';
import { Amplify } from '@aws-amplify/core';
import { DeferredLoading } from './components/deferredComponent';
import Layout from '@components/biz/layout';
import LoadingPage from '@components/biz/layout/Auth/LoadingPage';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import NotFoundPage from '@pages/404';
import LoginIndex from '@pages/login';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import awsconfig from './aws-exports';
import GlobalContextProvider, { GlobalStateContext } from './context/GlobalContextProvider';
import { Face3Provider } from './components/vision/face3Context';
import './i18n';
import { pageRoutes } from './routes/routes';
import { PATHS, REDIRECTS, pageNames } from './routes/manifest';
import './styles/global.css';
import NativePageTheme from './theme/NativePageTheme';
import AppPullRefresh from './components/AppPullRefresh';
import AppGuestGate from './components/AppGuestGate';
import { ContactsEmpty } from './components/MobileContactList';
import AppBootstrap from './components/AppBootstrap';
import AppUpdateRuntime from './components/AppUpdateRuntime';
import AppStartupReady from './components/AppStartupReady';
import AppNavigation from './components/AppNavigation';
import AppTopBar from './components/AppTopBar';
import AppQrScanner from './components/AppQrScanner';
import AppInternalTest from './components/AppInternalTest';
import AppOfflineDevices, { AppOfflineStateContext } from './components/AppOfflineDevices';
import { currentAppToken } from './services/appSession';
import { appPageBackground, appTabBarHeight, appTabPaths, appTabTopBarHeight } from './services/appNavigation';
import AppHomeRuntime from './components/AppHomeRuntime';
import AppLocationDisclosure from './components/AppLocationDisclosure';
import { isAppHome } from './services/deviceService';

const routeAllowed = (route, customerInfo) => {
  if (route.access === 'always') return true;
  if (route.appForced && isAppHome) return true;
  return gUtils.isContainPage(customerInfo.access, pageNames[route.access], customerInfo.isSesameApp);
};

const RedirectWithQuery = ({ to }) => {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
};

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
      setAllowedRoutes(
        pageRoutes.filter((route) => !['fixed', 'app'].includes(route.access) && routeAllowed(route, loginInfo))
      );
    }
  }, [gStripe.customerInfo]);

  const renderRoute = (route) => {
    const page = <route.component />;
    return (
      <Route
        key={route.path}
        path={route.path}
        element={
          isAppHome && route.guestGate ? (
            <AppGuestGate fallback={route.path === PATHS.contacts ? <ContactsEmpty /> : null}>{page}</AppGuestGate>
          ) : (
            page
          )
        }
      />
    );
  };

  if (isAppHome && !gManageDevice.devicesLoaded && location.pathname === PATHS.root) {
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

  if (isAppHome && gAuth.isSigningOut) return <DeferredLoading />;

  if (isAppHome && !allowedRoutes.length && location.pathname !== PATHS.login) return <DeferredLoading />;

  if (!isAppHome && gStripe.isPending) {
    return <LoadingPage />;
  }

  return (
    <>
      {isAppHome && <AppPullRefresh />}
      <Routes>
        <Route path={PATHS.login} element={<LoginIndex />} />
        <Route element={<Layout />}>
          {pageRoutes
            .filter((route) => route.access === 'fixed' || (route.access === 'app' && isAppHome))
            .map(renderRoute)}
          {allowedRoutes.map(renderRoute)}
          {allowedRoutes.length > 0 &&
            REDIRECTS.map(({ from, to }) => <Route key={from} path={from} element={<RedirectWithQuery to={to} />} />)}
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
  const frameRef = useRef(null);
  const lastScrollTop = useRef(0);
  const tabPage = appTabPaths.includes(location.pathname);
  const setHeaderHidden = (hidden) => {
    frameRef.current.dataset.appHeader = hidden ? 'hidden' : 'shown';
  };
  const setHeaderDocked = (top) => {
    frameRef.current.dataset.appDocked = String(top > 0);
  };
  useLayoutEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = location.pathname === '/' ? homeScrollTop.current : 0;
      lastScrollTop.current = contentRef.current.scrollTop;
      setHeaderHidden(false);
      setHeaderDocked(contentRef.current.scrollTop);
    }
  }, [location.pathname]);
  if (!isAppHome) return children;
  return (
    // Pages scroll inside the content box, never the document: the WebView moves even fixed elements while the
    // document scrolls, which drags the title bar along.
    <Box
      ref={frameRef}
      sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <AppTopBar />
      <Box
        ref={contentRef}
        onScroll={(event) => {
          if (location.pathname === '/') homeScrollTop.current = event.currentTarget.scrollTop;
          if (!tabPage) return;
          const top = event.currentTarget.scrollTop;
          const delta = top - lastScrollTop.current;
          lastScrollTop.current = top;
          setHeaderDocked(top);
          if (top <= appTabTopBarHeight) setHeaderHidden(false);
          else if (Math.abs(delta) >= 1) setHeaderHidden(delta > 0);
        }}
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          position: 'relative',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          overscrollBehaviorX: 'none',
          ...(tabPage && {
            display: 'flex',
            flexDirection: 'column',
            // The tab header floats over the content like an iOS navigation bar.
            pt: `${appTabTopBarHeight}px`,
            scrollPaddingTop: `${appTabTopBarHeight}px`,
            bgcolor: appPageBackground,
            // The floating tab bar overlays the content; keep the last rows scrollable above it.
            pb: `calc(${appTabBarHeight}px + env(safe-area-inset-bottom))`,
          }),
        }}
      >
        {/* Same element on every route so the app tree never remounts; only tab pages lay it out. */}
        <Box sx={tabPage ? { flex: '1 0 0', minHeight: 0 } : { display: 'contents' }}>{children}</Box>
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
              // Scroll areas show no bar in the APP, as the Android WebView never draws one.
              '*': { scrollbarWidth: 'none' },
              '*::-webkit-scrollbar': { display: 'none' },
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
              {/* Face3 共享环境挂在路由之外（见 face3Context）：实时画面在 Vision 首页点进详情页时不断开 */}
              <Face3Provider>
                <AppContent />
              </Face3Provider>
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
