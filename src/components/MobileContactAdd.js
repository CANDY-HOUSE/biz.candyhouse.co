import React from 'react';
import { Box } from '@mui/material';
import AddEmployee from './biz/device/AddEmployee';
import { biz3utils } from '@/utils/biz3utils';

const MobileContactAdd = () => {
  const handleOpenPage = (paramStr) => {
    const { protocol, host } = new URL(window.location.href);
    const domainUrl = `${protocol}//${host}`;
    const fullUrl = `${domainUrl}/biz/employees/list-item?${paramStr}`;
    const scheme = `ssm://UI/webview/open?${new URLSearchParams({
      notifyName: 'FriendChanged',
      url: fullUrl,
    })}`;
    biz3utils.triggerScheme(scheme);
  };

  const handleRefreshList = () => {
    const scheme = `ssm://UI/webview/notify?${new URLSearchParams({
      notifyName: 'RefreshList',
    })}`;
    biz3utils.triggerScheme(scheme);
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      <AddEmployee
        completionCallback={(res) => {
          if (!res.success) {
            return;
          }
          // refresh
          const uid = res.data.Attributes.find((it) => it.Name === 'sub')?.Value;
          const email = res.data.Attributes.find((it) => it.Name === 'email')?.Value;
          const newSearchParams = new URLSearchParams(new URLSearchParams(window.location.search));
          newSearchParams.set('uid', uid);
          newSearchParams.set('email', email);
          handleOpenPage(newSearchParams.toString());
          setTimeout(() => {
            handleRefreshList();
          }, 0);
        }}
      />
    </Box>
  );
};

export default MobileContactAdd;
