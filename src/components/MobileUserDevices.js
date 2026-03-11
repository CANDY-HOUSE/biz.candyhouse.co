import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Button,
  Drawer,
  CircularProgress,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteItem from '@/components/biz/DeleteItem';
import { useTranslation } from 'react-i18next';

const MobileUserDevices = ({ deviceKeys, onAddButtonClickHandler, onDelete, onRemoveUser }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const { t } = useTranslation();

  const roleAndTime = (device) => {
    const role =
      parseInt(device.keyLevel) === 0
        ? t('deviceMember.role.owner')
        : parseInt(device.keyLevel) === 1
          ? t('deviceMember.role.manager')
          : t('deviceMember.role.guest');
    return `${role}`;
  };

  return (
    <>
      <Box sx={{ px: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            pb: 0,
          }}
        >
          <Typography variant="h4" color="title.main" sx={{ fontWeight: 'bold' }}>
            {t('pages.sesameAccessControlDevice.index.UserKeyList')}
          </Typography>
          <IconButton onClick={onAddButtonClickHandler}>
            <AddCircleIcon fontSize="small" style={{ color: 'rgba(0, 0, 0, 0.54)' }} />
          </IconButton>
        </Box>
        <List sx={{ bgcolor: 'white', borderRadius: 1, mb: 2 }}>
          {deviceKeys?.length < 1 && (
            <Typography variant="body2" color="info.light">
              {t('pages.sesameAccessControlDevice.index.NoResult')}
            </Typography>
          )}
          {deviceKeys.map((device, index) => (
            <React.Fragment key={index}>
              <ListItem
                disablePadding
                sx={{
                  '& .MuiListItemSecondaryAction-root': {
                    right: 0,
                  },
                }}
                secondaryAction={
                  <DeleteItem
                    handleCheck={(_e) => {
                      onDelete && onDelete(device.deviceUUID);
                    }}
                    employeeRole={parseInt(device.keyLevel) < parseInt(device.curLevel) ? 'Owner' : ''}
                  />
                }
              >
                <ListItemText
                  primary={
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'title.main',
                        mb: 0.5,
                        mr: 5,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {device.deviceName}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography component="span" sx={{ color: 'title.main', fontSize: '0.8rem' }}>
                        {roleAndTime(device)}
                      </Typography>
                      <Typography component="span" sx={{ color: 'info.light', ml: 1, fontSize: '0.8rem' }}>
                        {device.msgData}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider light />
            </React.Fragment>
          ))}
        </List>
        <Box sx={{ display: onRemoveUser ? 'flex' : 'none', justifyContent: 'center' }}>
          <Button
            variant="text"
            onClick={(event) => {
              event.stopPropagation();
              setDrawerOpen(true);
            }}
            sx={{
              color: 'error.main',
              fontSize: '1rem',
            }}
          >
            {t('pages.sesameAccessControlDevice.index.DeleteFrienddHint')}
          </Button>
        </Box>
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              maxHeight: '50vh',
              pb: '16px',
            },
          }}
        >
          <Box sx={{ width: '100%', '& .MuiListItem-root': { justifyContent: 'center' } }}>
            <List>
              <ListItem
                onClick={() => {
                  setRemoveLoading(true);
                  onRemoveUser &&
                    onRemoveUser(() => {
                      setRemoveLoading(false);
                      setDrawerOpen(false);
                    });
                }}
              >
                <Typography color="error.main">{'削除'}</Typography>
                {removeLoading && <CircularProgress size={16} color="info" sx={{ ml: 1 }} />}
              </ListItem>
              <ListItem onClick={() => setDrawerOpen(false)}>
                <Typography>{t('deviceMember.opt.cancel')}</Typography>
              </ListItem>
            </List>
          </Box>
        </Drawer>{' '}
      </Box>
    </>
  );
};

export default MobileUserDevices;
