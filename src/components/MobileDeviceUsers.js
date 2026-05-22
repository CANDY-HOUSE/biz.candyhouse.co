import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Chip,
  Typography,
  Drawer,
  Collapse,
  SvgIcon,
} from '@mui/material';
import { AddCircleOutlineOutlined, ExpandMore, ExpandLess } from '@mui/icons-material';
import { DataSearch } from '@components/biz/device/DataSearch';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils';
import { SvgArrow } from '@/assets/svg/svgLock';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gUtils } from '@/utils/gUtils';

const MobileDeviceUsers = ({
  users,
  fetchUserAndDevices,
  onAddClickHandler,
  onRemoveUser,
  onModifyGuestTag,
  onShareGuestQRCode,
  gStrip,
  gManageEmployee,
  showType = 'widget',
  defaultManageMode = false,
}) => {
  const [searchResult, setSearchResult] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState({});
  const [expandedItems, setExpandedItems] = useState(new Set());
  const { t } = useTranslation();
  const prevUsersCountRef = useRef();
  const DeviceMemberChangedName = 'DeviceMemberChanged';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSettingPush = Boolean(searchParams.get('setting')) === true;
  const isManage = searchParams.get('type') === 'manage';

  const groupedUsers = useMemo(() => {
    const result = [];
    const processed = new Set();
    users.forEach((user) => {
      const key = user.subUUID || user.guestKeyId;
      if (processed.has(key)) return;
      if (user.guestKeyId) {
        const matchingItems = users.filter((item) => item.secretKey === user.guestKeyId && item.subUUID);
        if (matchingItems.length > 0) {
          result.push({
            ...user,
            employeeName: gUtils.formatTimestampToMonthDayLocal(user.employeeName) ?? user.employeeName,
            items: matchingItems,
          });
          matchingItems.forEach((item) => processed.add(item.subUUID));
        } else {
          result.push({
            ...user,
            employeeName: gUtils.formatTimestampToMonthDayLocal(user.employeeName) ?? user.employeeName,
          });
        }
        processed.add(key);
      } else if (user.secretKey) {
        const hasMatchingGuest = users.some((item) => item.guestKeyId === user.secretKey);
        if (!hasMatchingGuest) {
          result.push(user);
          processed.add(key);
        }
      } else {
        result.push(user);
        processed.add(key);
      }
    });
    return result;
  }, [users]);

  const displayList = useMemo(() => {
    return searchResult.key?.length > 0 ? searchResult.result : groupedUsers;
  }, [users, searchResult, groupedUsers]);

  useEffect(() => {
    if (displayList && displayList.length > 0) {
      const allExpandableItems = displayList
        .filter((user) => user.guestKeyId?.length > 0 && user.items?.length > 0)
        .map((user) => user.guestKeyId);
      setExpandedItems(new Set(allExpandableItems));
    }
  }, [displayList]);

  const toggleExpand = (key) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  useLayoutEffect(() => {
    if (fetchUserAndDevices) {
      fetchUserAndDevices(isManage || defaultManageMode);
    }
  }, []);

  useEffect(() => {
    if (users.length < 1) {
      return;
    }
    const currentUsersCount = users?.length || 0;
    const prevUsersCount = prevUsersCountRef.current;
    if (prevUsersCount !== undefined && currentUsersCount !== prevUsersCount) {
      const scheme = `ssm://UI/webview/notify?${new URLSearchParams({
        notifyName: DeviceMemberChangedName,
      })}`;
      biz3utils.triggerScheme(scheme);
    }
    prevUsersCountRef.current = currentUsersCount;
  }, [users]);

  const handleOpenPage = () => {
    if (gStrip.isFromApp && showType === 'widget') {
      const currentUrl = window.location.href;
      const url = new URL(currentUrl);
      url.searchParams.delete('displayType');
      url.pathname = url.pathname.replace('/index', '/user');
      const scheme = `ssm://UI/webview/open?${new URLSearchParams({
        notifyName: DeviceMemberChangedName,
        url: `${url.toString()}&type=manage`,
      })}`;
      biz3utils.triggerScheme(scheme);
    } else {
      const url = new URL(window.location.href);
      const newSearchParams = new URLSearchParams(url.searchParams);
      newSearchParams.delete('displayType');
      newSearchParams.set('type', 'manage');
      newSearchParams.set('setting', true);
      const did = newSearchParams.get('did');
      did && newSearchParams.set('deviceUUID', did);
      newSearchParams.delete('did');
      navigate({
        pathname: '/device-setting/user',
        search: newSearchParams.toString(),
      });
    }
  };

  useEffect(() => {
    if (!drawerOpen) {
      setSelectedUser({});
    }
  }, [drawerOpen]);

  const me = useMemo(() => {
    return users.find((it) => it.subUUID === gStrip.customerInfo.subUUID);
  }, [users]);

  const handleAddContact = () => {
    const subUUID = selectedUser.subUUID;
    if (!subUUID) return;
    gManageEmployee.addEmployee(
      [
        {
          friendID: subUUID,
          companyID: gStrip.customerInfo.companyID,
        },
      ],
      (resp) => {
        resp.success &&
          biz3utils.triggerScheme(
            `ssm://UI/webview/notify?${new URLSearchParams({
              notifyName: 'RefreshList',
            })}`
          );
      }
    );
    setDrawerOpen(false);
  };

  if (isManage || defaultManageMode) {
    return (
      <Box sx={{ width: '100%', bgcolor: 'background.paper', pl: 0 }}>
        {!gStrip.isFromApp && isSettingPush && (
          <Box sx={{ display: 'flex', alignItems: 'center', pt: 1, pl: 2 }}>
            <IconButton onClick={() => navigate(-1)} disableRipple>
              <KeyboardArrowLeftIcon sx={{ ml: -2 }} />
              <Typography variant="h3" sx={{ color: 'title.main' }}>
                {t('pages.login.ReturnToMailInput')}
              </Typography>
            </IconButton>
          </Box>
        )}
        <Box sx={{ p: 2, pb: 1, display: 'flex' }}>
          <DataSearch
            callSearch={(e) => {
              const searchResult = e ? users.filter((it) => it.employeeName.includes(e)) : [];
              setSearchResult({
                key: e,
                result: searchResult,
              });
            }}
          />
          <IconButton onClick={onAddClickHandler} sx={{ p: 0, pl: 1 }}>
            <AddCircleOutlineOutlined color="info.light" />
          </IconButton>
        </Box>
        <List sx={{ pt: 0 }}>
          {displayList.map((user, _index) => (
            <Box key={user.subUUID || user.guestKeyId}>
              <ListItem
                sx={{ py: 0 }}
                onClick={() => {
                  if (parseInt(user.keyLevel) < parseInt(me?.keyLevel) || me?.subUUID === user.subUUID) return;
                  setSelectedUser(user);
                  setDrawerOpen(true);
                }}
              >
                <ListItemAvatar>
                  <Avatar variant="circular" sx={{ bgcolor: 'info.light' }}>
                    {user.employeeName?.charAt(0)?.toUpperCase() ?? ''}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{user.employeeName}</span>
                      <Chip
                        label={
                          parseInt(user.keyLevel) === 0
                            ? t('deviceMember.role.owner')
                            : parseInt(user.keyLevel) === 1
                              ? t('deviceMember.role.manager')
                              : t('deviceMember.role.guest')
                        }
                        size="small"
                        variant="filled"
                        color="primary.main"
                        sx={{ fontSize: '0.6rem', height: '1.2rem' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography component="span" sx={{ color: 'info.light', fontSize: '0.8rem' }}>
                      {user.msgdata}
                    </Typography>
                  }
                />
                {user.guestKeyId?.length > 0 && (
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(user.guestKeyId);
                    }}
                    sx={{ mr: 0, color: user.items?.length > 0 ? 'title.main' : 'info.light' }}
                  >
                    {expandedItems.has(user.guestKeyId) ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                )}
              </ListItem>
              {user.items && (
                <Collapse in={expandedItems.has(user.guestKeyId)} timeout="none">
                  {user.items.map((subUser) => (
                    <ListItem
                      key={subUser.subUUID || subUser.guestKeyId}
                      onClick={() => {
                        if (parseInt(subUser.keyLevel) < parseInt(me.keyLevel) || me.subUUID === subUser.subUUID)
                          return;
                        setSelectedUser(subUser);
                        setDrawerOpen(true);
                      }}
                      sx={{ pl: 4, py: 0 }}
                    >
                      <ListItemAvatar>
                        <Avatar variant="circular" sx={{ bgcolor: 'info.light' }}>
                          {subUser.employeeName?.charAt(0)?.toUpperCase() ?? ''}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <span>{subUser.employeeName}</span>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </Collapse>
              )}
            </Box>
          ))}
        </List>
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              maxHeight: '50vh',
            },
          }}
        >
          <Box sx={{ width: '100%', '& .MuiListItem-root': { justifyContent: 'center' } }}>
            <List>
              <ListItem>
                <Typography sx={{ color: 'rgb(204, 204, 204)' }}>{selectedUser.employeeName}</Typography>
              </ListItem>
              {selectedUser.guestKeyId?.length > 0 && (
                <>
                  <ListItem
                    onClick={() => {
                      setDrawerOpen(false);
                      onModifyGuestTag(selectedUser);
                    }}
                  >
                    <Typography>{t('pages.sesameAccessControlDevice.index.ModifyGuestKeyTag')}</Typography>
                  </ListItem>
                  <ListItem
                    onClick={() => {
                      setDrawerOpen(false);
                      onShareGuestQRCode(selectedUser);
                    }}
                  >
                    <Typography>{t('pages.sesameAccessControlDevice.index.ShareTheKey')}</Typography>
                  </ListItem>
                </>
              )}
              <ListItem
                onClick={() => {
                  onRemoveUser(selectedUser);
                  setDrawerOpen(false);
                }}
              >
                <Typography color="error.main">{t('deviceMember.opt.revoke')}</Typography>
              </ListItem>
              {selectedUser.subUUID && (
                <ListItem onClick={handleAddContact}>
                  <Typography>{t('deviceMember.opt.addContact')}</Typography>
                </ListItem>
              )}
              <ListItem onClick={() => setDrawerOpen(false)}>
                <Typography>{t('deviceMember.opt.cancel')}</Typography>
              </ListItem>
            </List>
          </Box>
        </Drawer>
      </Box>
    );
  }
  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: 'background.paper',
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 80,
      }}
      onClick={handleOpenPage}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {displayList.map((user) => (
          <Avatar
            key={user.subUUID || user.guestKeyId}
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'info.light',
            }}
          >
            {user.employeeName?.charAt(0)?.toUpperCase() ?? ''}
          </Avatar>
        ))}
      </Box>
      {displayList.length > 0 && <SvgIcon component={SvgArrow} />}
    </Box>
  );
};

export default MobileDeviceUsers;
