import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GlobalStateContext } from '../context/GlobalContextProvider';
import loginStyles from '../styles/login.module.css';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useTranslation } from 'react-i18next';
import { LoadingButton } from '@mui/lab';
import siteIcon from '@assets/site-icon.png';
import { URLs } from '@constants/URLs';
import { gUtils } from '@/utils/gUtils';

const LoginIndex = () => {
  const navigate = useNavigate();
  const { gAuth, gStripe, setSnackbarValue } = useContext(GlobalStateContext);
  const { t } = useTranslation(); // i18n
  const [btnState, setBtnState] = useState({ ready: false, loading: false });
  const [pagePwd, setPagePwd] = useState('');
  const [loginMail, setMail] = useState('');
  const [isVerifyCode, setVerifying] = useState(false); //判斷顯示輸入mail或顯示輸入密嗎
  const [isSigning, setIsSigning] = useState(false); //circle progress
  const [errHint, setErrHint] = useState(false);
  const [mailChk, setMailChk] = useState(true);
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const loginBtn = useRef(null);

  useEffect(() => {
    let loginStripe = localStorage.getItem('curLogin');
    if (loginStripe) {
      navigate('/'); // 如果已经登录，直接跳转到首页
    }
  }, []);

  useEffect(() => {
    if (pagePwd.length === 4) {
      setIsSigning(true);
      // 通过 webSocket 路由 signIn , 调用 lambda Hub3WebSocketAPI_signIn
      // 在 AWS Lambda: Hub3WebSocketAPI_signIn 里：
      // 先调用 cognito signUp 注册，
      // 然后通过 cognito 的 用户池->DevTeamJP->身份验证->扩展->创建身份验证质询 Lambda 触发器-> lambda函数account_create_auth  来发送验证码 到客户邮箱
      gAuth.handleChallenge({
        pagePwd,
        cb: (resp) => {
          setVerifying(false);
          if (resp instanceof Error) {
            setSnackbarValue({
              open: true,
              msg: resp.message,
            });
            return;
          }
          gStripe.getCustomerInfo(loginMail);
          navigate(redirectPath);
        },
      });
    }
  }, [pagePwd]); // eslint-disable-line react-hooks/exhaustive-deps

  // 輸入完帳號時，按下enter等於點擊登入鍵
  const handleKeydown = (e) => {
    if (e.target.value !== '' && e.keyCode === 13) {
      loginBtn.current.click();
    }
  };

  const handleLoginBtnClick = async () => {
    setBtnState({ ready: btnState.ready, loading: true });
    gAuth.handleSign({
      loginMail,
      cb: (resp) => {
        setPagePwd('');
        if (resp instanceof Error) {
          setSnackbarValue({
            open: true,
            msg: resp.message,
          });
          return;
        }
        setVerifying(true);
        setBtnState({ ready: btnState.ready, loading: false });
      },
    });
  };

  return (
    <Box
      sx={{
        flexDirection: 'column',
        display: 'flex',
        height: '100vh',
        justifyContent: 'space-between',
      }}
    >
      <Box
        sx={{
          padding: '24px 10px 0 10px',
          maxWidth: '360px',
          margin: 'auto',
        }}
      >
        <Box
          component="img"
          src={siteIcon}
          alt="Biz"
          sx={{
            display: 'block',
            maxHeight: '100px',
            maxWidth: '100%',
            margin: '16px auto',
          }}
        />
        <input
          className={loginStyles.loginBox}
          placeholder={t('pages.login.Email')}
          value={loginMail}
          onKeyDown={(e) => {
            handleKeydown(e);
          }}
          onChange={(e) => {
            setMail(e.target.value);
            const mailChk = gUtils.isValidEmail(e.target.value);
            setBtnState({ ready: mailChk, loading: false });
            setMailChk(mailChk);
          }}
          style={{ display: isVerifyCode ? 'none' : 'block' }}
        />
        <Typography
          variant="h6"
          color="error"
          sx={{
            display: mailChk ? 'none' : 'block',
            textAlign: 'center',
            marginBottom: '30px',
          }}
        >
          {t('pages.login.EmailAddressFormatIsIncorrect')}
        </Typography>

        <Box sx={{ display: isVerifyCode ? 'none' : 'block' }}>
          <Typography variant="h5" sx={{ textAlign: 'center' }}>
            <a
              href={URLs.terms}
              target="_blank"
              style={{
                color: '#28aeb1',
                fontWeight: 'bold',
                display: 'inline',
                cursor: 'pointer',
              }}
              rel="noopener noreferrer"
            >
              {t('pages.login.TermsOfService')}
            </a>
            {t('pages.login.And')}
            <a
              href={URLs.privacy}
              target="_blank"
              style={{
                color: '#28aeb1',
                fontWeight: 'bold',
                display: 'inline',
              }}
              rel="noopener noreferrer"
            >
              {t('pages.login.PrivacyPolicy')}
            </a>
            {t('pages.login.IfYouAgreePleaseLogIn')}
          </Typography>
        </Box>

        <LoadingButton
          ref={loginBtn}
          loading={btnState.loading}
          fullWidth
          sx={{
            color: '#fff',
            height: '35px',
            marginTop: '16px',
            display: isVerifyCode ? 'none' : 'block',
            fontSize: '12px',
          }}
          variant="contained"
          color="primary"
          disabled={!btnState.ready}
          onClick={async () => {
            handleLoginBtnClick();
          }}
        >
          {t('pages.login.Login')}
        </LoadingButton>

        <Box style={{ display: isVerifyCode ? 'block' : 'none' }}>
          <CircularProgress
            color="primary"
            sx={{
              display: isSigning ? 'block' : 'none',
              margin: '0 auto',
            }}
          />
          <Typography
            variant="h5"
            color="initial"
            sx={{
              display: isVerifyCode ? 'block' : 'none',
              textAlign: 'center',
            }}
          >
            {t('pages.login.EnterVerificationCode')}
          </Typography>

          <input
            placeholder="1234"
            type="number"
            value={pagePwd}
            disabled={!isVerifyCode}
            className={loginStyles.loginBox}
            onChange={(e) => {
              const currentPWD = e.target.value;
              if (e.target.value.length <= 4) {
                setPagePwd(currentPWD);
              }
            }}
          />

          <Typography
            variant="h6"
            color="error"
            sx={{
              display: errHint ? 'block' : 'none',
              textAlign: 'center',
              marginBottom: '30px',
            }}
          >
            入力された認証コードが正しくありません。認証コードが再発行されていますので、新しく受け取ったコードを入力して下さい。
          </Typography>

          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Button
              variant="text"
              onClick={() => {
                setVerifying(false);
                setErrHint(false);
                setMail('');
              }}
              style={{
                color: '#28aeb1',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <KeyboardArrowLeftIcon />
              {t('pages.login.ReturnToMailInput')}
            </Button>
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <img
          alt="icon"
          style={{ width: '36%' }}
          src="https://cdn.shopify.com/s/files/1/0016/1870/6495/files/busniess.png?v=1663835284"
        />
        <img
          alt="icon"
          style={{ width: '36%' }}
          src="https://cdn.shopify.com/s/files/1/0016/1870/6495/files/girlAndDoor-07.png?v=1663835270"
        />
      </Box>
    </Box>
  );
};

export default LoginIndex;
