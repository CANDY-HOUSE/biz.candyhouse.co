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
import { ios } from '@/theme/appHomeStyle';
import SettingsGroup from './SettingsGroup';

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
      <Box>
        <SettingsGroup
          header={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {t('pages.sesameAccessControlDevice.index.UserKeyList')}
              <IconButton onClick={onAddButtonClickHandler} sx={{ my: '-8px', mr: '-8px' }}>
                <AddCircleIcon sx={{ fontSize: 24, color: ios.tint }} />
              </IconButton>
            </Box>
          }
        >
          <List disablePadding>
            {deviceKeys?.length < 1 && (
              <Typography sx={{ px: '16px', py: '15px', fontSize: 15, color: ios.secondaryLabel }}>
                {t('pages.sesameAccessControlDevice.index.NoResult')}
              </Typography>
            )}
            {deviceKeys.map((device, index) => (
              <React.Fragment key={index}>
                <ListItem
                  disablePadding
                  sx={{
                    minHeight: 60,
                    pl: '16px',
                    '& .MuiListItemSecondaryAction-root': {
                      right: '8px',
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
                        sx={{
                          fontSize: 17,
                          color: ios.label,
                          mb: '2px',
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
                        <Typography component="span" sx={{ color: ios.secondaryLabel, fontSize: 13 }}>
                          {roleAndTime(device)}
                        </Typography>
                        <Typography component="span" sx={{ color: ios.secondaryLabel, ml: 1, fontSize: 13 }}>
                          {device.msgData || t('contacts.alwaysAvailable')}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider light />
              </React.Fragment>
            ))}
          </List>
        </SettingsGroup>
        {onRemoveUser && (
          <SettingsGroup>
            <Button
              fullWidth
              variant="text"
              onClick={(event) => {
                event.stopPropagation();
                setDrawerOpen(true);
              }}
              sx={{
                minHeight: 52,
                borderRadius: 0,
                color: ios.red,
                fontSize: 17,
                fontWeight: 400,
                textTransform: 'none',
                '&:active': { bgcolor: ios.pressed },
              }}
            >
              {t('pages.sesameAccessControlDevice.index.DeleteFrienddHint')}
            </Button>
          </SettingsGroup>
        )}
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
                <Typography color="error.main">{t('pages.ir.remote.delete')}</Typography>
                {removeLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
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
