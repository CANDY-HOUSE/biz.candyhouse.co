import { List, ListItem, Typography, Box } from '@mui/material';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useContext, useEffect, useState } from 'react';
import EditableText from '@/components/EditableText';
import { biz3utils } from '@/utils/biz3utils';
import MobileQRCodeDialog from '@/components/MobileQRCodeDialog';
import { useTranslation } from 'react-i18next';

const Me = () => {
  const { gStripe, gManageEmployee, gMediaType } = useContext(GlobalStateContext);
  const [currentUserInfo, setCurrentUserInfo] = useState({});
  const [dataURL, setDataURL] = useState('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const qrCodeURL = biz3utils.generateUserQRCodeBySubUUID(gStripe.customerInfo.subUUID);
  const { t } = useTranslation();

  const infoItem = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: gMediaType.isMobile ? 'space-between' : 'flex-start',
  };

  const title = {
    width: '180px',
  };

  const content = {
    display: 'flex',
    justifyContent: 'flex-start',
    flex: gMediaType.isMobile ? 'none' : '1',
    marginLeft: gMediaType.isMobile ? 'auto' : '0',
  };

  const fetchCurrentUserInfo = async () => {
    gManageEmployee.getCurrentUserInfo((res) => {
      setCurrentUserInfo(res.data);
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
    <>
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
              initialValue={currentUserInfo.nickname}
              onSave={(newValue, callback) => {
                gManageEmployee.postEmployeeInfo({ Name: 'nickname', Value: newValue }, (res) => {
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

        <ListItem sx={{ ...infoItem }}>
          <Typography sx={{ ...title }}>{t('pages.login.Email')}</Typography>
          <Box sx={{ ...content }}>{currentUserInfo.email}</Box>
        </ListItem>

        <ListItem sx={{ ...infoItem }}>
          <Typography sx={{ ...title }}>{'sub UUID'}</Typography>
          <Box sx={{ ...content }}>{currentUserInfo.sub}</Box>
        </ListItem>

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
      <MobileQRCodeDialog
        open={qrDialogOpen}
        qrCodeUrl={dataURL}
        isMobile={gMediaType.isMobile}
        userName={currentUserInfo.nickname || gStripe.customerInfo.employeeName}
        onClose={() => setQrDialogOpen(false)}
      />
    </>
  );
};

export default Me;
