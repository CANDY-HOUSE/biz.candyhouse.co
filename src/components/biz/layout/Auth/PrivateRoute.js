import React, { useContext, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import LoadingPage from './LoadingPage';
import { gConfig } from '@constants/gConfig';

function PrivateRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const { gAuth, gStripe } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const hasFetchedUserInfo = useRef(false);

  useEffect(() => {
    try {
      let loginStripe = localStorage.getItem('curLogin');
      let shouldFetchUserInfo = false;
      if (gAuth.loginState === gConfig.loginState.loginOut && loginStripe) {
        shouldFetchUserInfo = true;
      }
      if (shouldFetchUserInfo && !hasFetchedUserInfo.current) {
        gStripe.getCustomerInfo(loginStripe);
        gAuth.setLoginState(gConfig.loginState.login);
        hasFetchedUserInfo.current = true;
      }
    } catch (error) {
      console.error('Failed to initialize auth or fetch user info:', error);
    } finally {
      setLoading(false);
    }
  }, [gAuth.loginState]);

  useEffect(() => {
    const spaceID = searchParams.get('spaceID');
    const token = searchParams.get('token');
    let companyID = localStorage.getItem('curLogin');
    if (spaceID && token && !companyID && gAuth.loginState === gConfig.loginState.loginOut) {
      localStorage.setItem('curLogin', spaceID);
      gAuth.autoLogin(token);
      gStripe.getCustomerInfo(spaceID);
    }
  }, [searchParams, gAuth.loginState]);

  if (loading) {
    return <LoadingPage />;
  }

  if (gAuth.loginState === gConfig.loginState.login || gAuth.loginState === gConfig.loginState.configured) {
    return children;
  } else if (gAuth.loginState === 'tokenRefresh') {
    return <LoadingPage />;
  } else {
    const spaceID = searchParams.get('spaceID');
    const token = searchParams.get('token');
    if (spaceID && token) {
      return <LoadingPage />; // 自动登录中显示加载页面
    } else {
      let redirectPath = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
      if (gAuth.isClearData) {
        redirectPath = '/login';
      }
      return <Navigate to={redirectPath} replace />;
    }
  }
}

export default PrivateRoute;
