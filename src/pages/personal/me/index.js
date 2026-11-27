import { Avatar, List, ListItem, ListItemIcon, Typography, Box, SvgIcon, Divider } from '@mui/material';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useContext, useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Buffer } from 'buffer';
import EditableText from '@/components/EditableText';
import { biz3utils } from '@/utils/biz3utils';
import MobileQRCodeDialog from '@/components/MobileQRCodeDialog';
import { SvgArrow } from '@/assets/svg/svgLock';
import { useTranslation } from 'react-i18next';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { ios, homeCards, hoverSx, hairline } from '@/theme/appHomeStyle';
import { PATHS } from '@/routes/manifest';

const cardSx = { bgcolor: ios.card, borderRadius: ios.cardRadius, overflow: 'hidden' };

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
    url.pathname = PATHS.history.envSnapshot;
    url.searchParams.set('data', data);
    navigate({
      pathname: url.pathname,
      search: url.searchParams.toString(),
    });
  };

  const saveName = (newValue, callback) => {
    gManageEmployee.updateCurrentUserName(newValue, (res) => {
      callback(res.success);
      res.success &&
        biz3utils.triggerScheme(
          `ssm://UI/webview/notify?${new URLSearchParams({
            notifyName: 'UserProfileChanged',
          })}`
        );
    });
  };

  const qrDialog = (
    <MobileQRCodeDialog
      open={qrDialogOpen}
      qrCodeUrl={dataURL}
      isMobile={gMediaType.isMobile}
      userName={currentUserInfo.name || gStripe.customerInfo.employeeName}
      onClose={() => setQrDialogOpen(false)}
    />
  );

  useEffect(() => {
    fetchCurrentUserInfo();
    biz3utils.writeQrcode(qrCodeURL, (ins) => {
      const url = ins.toDataURL(10, 0);
      setDataURL(url);
    });
  }, []);

  // Profile on the left like an account page, sign-ins filling the rest.
  if (homeCards) {
    const displayName = currentUserInfo.name || currentUserInfo.email || '';
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '340px minmax(0, 1fr)' },
          alignItems: 'start',
          gap: '16px',
          px: '16px',
          pt: '8px',
          pb: '24px',
        }}
      >
        <Box
          sx={{
            ...cardSx,
            px: '24px',
            pt: '32px',
            pb: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: { md: 'sticky' },
            top: { md: 'calc(var(--page-header-offset, 0px) + 12px)' },
          }}
        >
          <Avatar
            sx={{
              width: 84,
              height: 84,
              fontSize: 34,
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(180deg, #A5ABB8 0%, #858994 100%)',
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ mt: '14px', maxWidth: '100%' }}>
            <EditableText
              style={{ fontSize: '22px', fontWeight: 700, lineHeight: '30px' }}
              initialValue={displayName}
              onSave={saveName}
            />
          </Box>
          <Typography sx={{ mt: '2px', fontSize: 15, color: ios.secondaryLabel, wordBreak: 'break-all' }}>
            {currentUserInfo.email}
          </Typography>
          <Box
            component="img"
            src={dataURL}
            alt="QR Code"
            onClick={() => setQrDialogOpen(true)}
            sx={{
              mt: '24px',
              width: 168,
              height: 168,
              p: '10px',
              borderRadius: '14px',
              border: `0.5px solid ${ios.separator}`,
              cursor: 'pointer',
            }}
          />
          <Typography sx={{ mt: '8px', fontSize: 13, color: ios.secondaryLabel }}>{t('deviceMember.qr')}</Typography>
          <Box sx={{ mt: '20px', pt: '14px', width: '100%', borderTop: hairline }}>
            <Typography sx={{ fontSize: 12, color: ios.secondaryLabel }}>sub UUID</Typography>
            <Typography sx={{ mt: '2px', fontSize: 13, color: ios.label, wordBreak: 'break-all', userSelect: 'all' }}>
              {currentUserInfo.sub}
            </Typography>
          </Box>
        </Box>
        {recentLogins.length > 0 && (
          <List disablePadding sx={cardSx}>
            {recentLogins.map((login, index) => (
              <ListItem
                key={index}
                onClick={() => openLoginDetail(login)}
                sx={{
                  minHeight: 60,
                  px: '20px',
                  gap: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  '&:active': { bgcolor: ios.pressed },
                  ...hoverSx({ bgcolor: ios.pressed }),
                  '&:not(:last-of-type)::after': {
                    content: '""',
                    position: 'absolute',
                    left: 20,
                    right: 0,
                    bottom: 0,
                    height: 0,
                    borderBottom: hairline,
                  },
                }}
              >
                <Typography sx={{ flex: 1, minWidth: 0, fontSize: 16, color: ios.label }}>
                  {getLoginValue(login, 'model')}
                </Typography>
                <Typography sx={{ fontSize: 14, color: ios.secondaryLabel, whiteSpace: 'nowrap' }}>
                  {getLoginValue(login, 'collectedAt')}
                </Typography>
                <KeyboardArrowRightIcon sx={{ fontSize: 22, color: ios.tertiaryLabel, flexShrink: 0 }} />
              </ListItem>
            ))}
          </List>
        )}
        {qrDialog}
      </Box>
    );
  }

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
            <EditableText initialValue={currentUserInfo.name || currentUserInfo.email} onSave={saveName} />
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
      {qrDialog}
    </Box>
  );
};

export default Me;
