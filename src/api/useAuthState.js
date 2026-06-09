import { useEffect, useState } from 'react';
import { gConfig } from '@constants/gConfig.js';
import WebSocketManager from '../websocket/WebSocketManager.ts';
import { Auth } from '@aws-amplify/auth';
import { Hub } from '@aws-amplify/core';

const AUTH_EVENTS = {
  SIGN_IN: 'signIn',
  SIGN_UP: 'signUp',
  SIGN_OUT: 'signOut',
  TOKEN_REFRESH: 'tokenRefresh',
  TOKEN_REFRESH_FAILURE: 'tokenRefresh_failure',
  MFA_REQUIRED: 'mfaRequired',
  COGNITO_HOSTED_UI: 'cognitoHostedUI',
  COGNITO_HOSTED_UI_FAILURE: 'cognitoHostedUI_failure',
  CONFIGURED: 'configured',
  USER_DELETED: 'userDeleted',
};

export const useAuthState = () => {
  const [loginState, setLoginState] = useState(gConfig.loginState.loginOut);
  const [isClearData, setIsClearData] = useState(false);
  const [user, setUser] = useState({});

  useEffect(() => {
    const checkTokenExpiration = (jwtToken) => {
      try {
        const payload = JSON.parse(atob(jwtToken.split('.')[1]));
        const exp = payload.exp * 1000;
        const now = Date.now();
        return exp > now;
      } catch (error) {
        console.error('【Auth】Token 解析失败', error);
        return false;
      }
    };
    const checkAuthStatus = async () => {
      try {
        const {
          idToken: { jwtToken },
        } = await Auth.currentSession();
        console.log('会话有效');
        WebSocketManager.connect(jwtToken);
      } catch (error) {
        console.log('会话无效', error);
        // 退出登录
        handleSignout();
      }
    };
    const handleConnectionFailure = async (currentToken) => {
      console.log('【Auth】WebSocket 重试多次失败，检查 token 有效期');
      const isValid = checkTokenExpiration(currentToken);
      if (isValid) {
        console.log('【Auth】Token 仍然有效，继续退避重连');
        return false;
      }
      console.log('【Auth】Token 已过期，调用 Auth.currentSession() 刷新');
      await checkAuthStatus();
      return true;
    };
    const authListener = ({ payload }) => {
      const { event, data } = payload;
      switch (event) {
        case AUTH_EVENTS.SIGN_IN:
          console.log('用户已登录', data);
          // 处理登录成功事件
          break;

        case AUTH_EVENTS.SIGN_OUT:
          console.log('用户已登出');
          WebSocketManager.closeConnection();
          break;

        case AUTH_EVENTS.TOKEN_REFRESH:
          console.log('令牌已刷新');
          // 处理令牌刷新事件
          break;

        case AUTH_EVENTS.TOKEN_REFRESH_FAILURE:
          console.log('令牌刷新失败', data);
          // 处理令牌刷新失败
          handleSignout();
          break;

        case AUTH_EVENTS.COGNITO_HOSTED_UI:
          console.log('托管 UI 登录成功', data);
          // 处理托管 UI 登录
          break;

        case AUTH_EVENTS.COGNITO_HOSTED_UI_FAILURE:
          console.log('托管 UI 登录失败', data);
          // 处理托管 UI 登录失败
          break;

        case AUTH_EVENTS.CONFIGURED:
          console.log('Auth 模块已配置');
          break;

        default:
          break;
      }
    };
    Hub.listen('auth', authListener);
    checkAuthStatus();
    WebSocketManager.setConnectionFailureCallback(handleConnectionFailure);
    return () => Hub.remove('auth', authListener);
  }, []);

  const handleSign = async ({ loginMail, cb }) => {
    await Auth.signUp({
      username: loginMail,
      password: 'Aa123456',
    })
      .then((_user) => {})
      .catch((err) => {
        console.log(err);
      });

    // [aws用戶登入-2(客製化驗證)]拿註冊好的aws用戶登入
    // 並經過sign up challenge =>define auth challenge => verify auth challange的lambda
    await Auth.signIn(loginMail)
      .then((user) => {
        // console.log('驗證', user)
        if (user.challengeName === 'CUSTOM_CHALLENGE' && typeof window !== 'undefined') {
          setUser(user);
          cb && cb(user);
        }
      })
      .catch((err) => {
        console.log(err);
        cb && cb(err);
      });
  };

  const handleSignout = async (cb) => {
    try {
      await Auth.forgetDevice();
      await Auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      clearCache();
      setIsClearData(true);
      cb && cb({ success: true });
    }
  };

  const clearCache = () => {
    setLoginState(gConfig.loginState.loginOut);
    localStorage.clear();
  };

  const autoLogin = (jwtToken) => {
    setLoginState(gConfig.loginState.login);
    WebSocketManager.connect(jwtToken);
  };

  const handleChallenge = async ({ pagePwd, cb }) => {
    try {
      const challengeAnswerResponse = await Auth.sendCustomChallengeAnswer(user, pagePwd); // 先經過create challenge的lambda
      const {
        idToken: { jwtToken },
      } = challengeAnswerResponse.signInUserSession;
      autoLogin(jwtToken);
      setIsClearData(false);
      setTimeout(() => {
        cb && cb(user);
      }, 0);
    } catch (error) {
      cb && cb(new Error('Incorrect username or password.'));
    }
  };

  const currentUserInfo = async () => {
    const res = await Auth.currentUserInfo();
    return res;
  };

  return {
    autoLogin,
    loginState,
    setLoginState,
    isClearData,
    handleSign,
    handleChallenge,
    handleSignout,
    currentUserInfo,
  };
};
