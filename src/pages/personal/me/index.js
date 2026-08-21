import { List, ListItem, ListItemIcon, Typography, Box, SvgIcon, Divider } from '@mui/material';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useContext, useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Buffer } from 'buffer';
import EditableText from '@/components/EditableText';
import { biz3utils } from '@/utils/biz3utils';
import MobileQRCodeDialog from '@/components/MobileQRCodeDialog';
import { SvgArrow } from '@/assets/svg/svgLock';
import { useTranslation } from 'react-i18next';

const Me = () => {
  const { gStripe, gManageEmployee, gMediaType } = useContext(GlobalStateContext);
  const navigate = useNavigate();
  const [currentUserInfo, setCurrentUserInfo] = useState({});
  const [dataURL, setDataURL] = useState('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const qrCodeURL = biz3utils.generateUserQRCodeBySubUUID(gStripe.customerInfo.subUUID);
  const { t } = useTranslation();

  const infoItem = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const title = {
    flexShrink: 0,
    marginRight: '16px',
  };

  const content = {
    display: 'flex',
  };

  const fetchCurrentUserInfo = async () => {
    gManageEmployee.getCurrentUserInfo((res) => {
      setCurrentUserInfo(res.data);
    });
  };

  const getLoginValue = (login, key) => {
    const found = (login || []).find((item) => item && key in item);
    return found ? found[key] : undefined;
  };

  const recentLogins = (currentUserInfo.recentLogins || [])
    .map((item) => JSON.parse(item))
    .sort((a, b) => new Date(getLoginValue(b, 'collectedAt')) - new Date(getLoginValue(a, 'collectedAt')));

  const openLoginDetail = (login) => {
    // 将单键对象数组合并成一个对象，复用 env-snapshot 详情页
    const data = Buffer.from(JSON.stringify(login), 'utf8').toString('base64');
    const url = new URL(window.location.href);
    url.pathname = '/biz/history/env-snapshot';
    url.searchParams.set('data', data);
    navigate({
      pathname: url.pathname,
      search: url.searchParams.toString(),
    });
  };

  useEffect(() => {
    fetchCurrentUserInfo();
    biz3utils.writeQrcode(qrCodeURL, (ins) => {
      const url = ins.toDataURL(10, 0);
      setDataURL(url);
    });
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <List
        sx={{
          '> .css-1samsxy-MuiListItem-root': {
            padding: '0px',
          },
        }}
      >
        <ListItem sx={{ ...infoItem }}>
          <Typography sx={{ ...title }}>{t('deviceMember.nickName')}</Typography>
          <Box sx={{ ...content }}>
            <EditableText
              initialValue={currentUserInfo.name || currentUserInfo.email}
              onSave={(newValue, callback) => {
                gManageEmployee.postEmployeeInfo({ Name: 'name', Value: newValue }, (res) => {
                  callback(res.success);
                  res.success &&
                    biz3utils.triggerScheme(
                      `ssm://UI/webview/notify?${new URLSearchParams({
                        notifyName: 'UserProfileChanged',
                      })}`
                    );
                });
              }}
            />
          </Box>
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem sx={{ ...infoItem }}>
          <Typography sx={{ ...title }}>{t('pages.login.Email')}</Typography>
          <Box sx={{ ...content }}>{currentUserInfo.email}</Box>
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem sx={{ ...infoItem }}>
          <Typography sx={{ ...title }}>{'sub UUID'}</Typography>
          <Typography
            sx={{
              ...content,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
              minWidth: 0,
            }}
          >
            {currentUserInfo.sub}
          </Typography>
        </ListItem>
        <Divider variant="middle" sx={{ opacity: 0.4 }} />
        <ListItem sx={{ ...infoItem, alignItems: 'start' }}>
          <Typography sx={{ ...title }}>{t('deviceMember.qr')}</Typography>
          <Box sx={{ ...content }}>
            <img
              src={dataURL}
              alt="QR Code"
              onClick={() => setQrDialogOpen(true)}
              style={{
                marginTop: '6px',
                width: '80px',
                height: '80px',
                cursor: 'pointer',
              }}
            />
          </Box>
        </ListItem>
      </List>
      <Box sx={{ bgcolor: 'secondary.main', height: 10, flexShrink: 0 }} />
      <List disablePadding>
        {recentLogins.map((login, index) => (
          <Fragment key={index}>
            <ListItem
              onClick={() => openLoginDetail(login)}
              sx={{ ...infoItem, justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <Box>
                <Typography>{getLoginValue(login, 'model')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography sx={{ color: 'text.secondary' }}>{getLoginValue(login, 'collectedAt')}</Typography>
                <ListItemIcon sx={{ minWidth: 'auto' }}>
                  <SvgIcon component={SvgArrow} />
                </ListItemIcon>
              </Box>
            </ListItem>
            {index < recentLogins.length - 1 && <Divider variant="middle" sx={{ opacity: 0.4 }} />}
          </Fragment>
        ))}
      </List>
      <MobileQRCodeDialog
        open={qrDialogOpen}
        qrCodeUrl={dataURL}
        isMobile={gMediaType.isMobile}
        userName={currentUserInfo.name || gStripe.customerInfo.employeeName}
        onClose={() => setQrDialogOpen(false)}
      />
    </Box>
  );
};

export default Me;
