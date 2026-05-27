import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Dialog, Divider, List, ListItem, TextField, Typography } from '@mui/material';
import { gUtils } from '@/utils/gUtils';

const getAttributeValue = (attributes, key) => {
  if (!Array.isArray(attributes)) return '';
  const item = attributes.find((attr) => attr.Name === key || attr.name === key);
  return item?.Value ?? item?.value ?? '';
};

const CSUserSearchDialog = ({ open, gManageEmployee, gAuth, setSnackbarValue, onClose }) => {
  const [email, setEmail] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setConfirming(false);
      setUserInfo(null);
    }
  }, [open]);

  const cognitoUser = useMemo(() => {
    return userInfo?.data ?? null;
  }, [userInfo]);

  const isEmailValid = useMemo(() => {
    return gUtils.isValidEmail(email.trim());
  }, [email]);

  const infoRows = useMemo(() => {
    if (!cognitoUser) return [];
    const attributes = cognitoUser.Attributes ?? [];
    return [
      { label: 'Email', value: getAttributeValue(attributes, 'email') || cognitoUser.email || email },
      { label: 'UUID', value: getAttributeValue(attributes, 'sub') || cognitoUser.sub || cognitoUser.Username },
      { label: 'Nickname', value: getAttributeValue(attributes, 'nickname') || cognitoUser.nickname || '' },
    ].filter((item) => item.value !== undefined && item.value !== null && item.value !== '');
  }, [cognitoUser, email]);

  const handleSearch = () => {
    const targetEmail = email.trim();
    if (!gUtils.isValidEmail(targetEmail)) return;
    setUserInfo(null);
    gManageEmployee.queryUserByCS(targetEmail, (res) => {
      if (res?.success === false) {
        setSnackbarValue({ open: true, msg: res.message });
        return;
      }
      setUserInfo(res);
    });
  };

  const handleCopyAndConfirm = async () => {
    const targetEmail = email.trim();
    if (!targetEmail || !cognitoUser) return;
    setConfirming(true);
    await navigator.clipboard.writeText(targetEmail);
    gManageEmployee.confirmQueryByCS(targetEmail, (res) => {
      setConfirming(false);
      setSnackbarValue({ open: true, msg: res.message });
      if (res?.success === false) return;
      onClose && onClose();
      gAuth.handleSignout();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          p: 2,
          borderRadius: '5px',
        },
      }}
    >
      <Box sx={{ width: { xs: '100%', sm: 420 }, height: 280, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            value={email}
            variant="filled"
            sx={{
              '& .MuiFilledInput-root': {
                height: '40px',
              },
              '& .MuiFilledInput-input': {
                py: 0,
              },
            }}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={!isEmailValid}
            sx={{ flexShrink: 0, height: '40px', color: 'white' }}
          >
            Search
          </Button>
        </Box>

        <Box sx={{ mt: 2, flex: 1, minHeight: 0, overflow: 'auto' }}>
          {userInfo && infoRows.length === 0 && <Typography variant="body2">No Cognito information found</Typography>}
          {infoRows.length > 0 && (
            <List disablePadding>
              {infoRows.map((item) => (
                <React.Fragment key={item.label}>
                  <ListItem sx={{ px: 0, py: 1, alignItems: 'flex-start', gap: 2 }}>
                    <Typography variant="body2" sx={{ width: 90, color: 'title.main', flexShrink: 0 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'info.light', wordBreak: 'break-all' }}>
                      {item.value}
                    </Typography>
                  </ListItem>
                  <Divider sx={{ opacity: 0.4 }} />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={handleCopyAndConfirm}
          disabled={confirming || !cognitoUser}
          sx={{ mt: 2, color: 'white' }}
        >
          {`Copy email -> Login`}
        </Button>
      </Box>
    </Dialog>
  );
};

export default CSUserSearchDialog;
