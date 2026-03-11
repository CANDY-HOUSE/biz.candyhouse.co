import React from 'react';
import { List, ListItem, Typography, Divider } from '@mui/material';
import EditableText from '@/components/EditableText';
import EmployeeRoleChip from '@/components/biz/EmployeeRoleChip';
import { useTranslation } from 'react-i18next';

const UserBasicInfo = ({ data, employeeEmail, isSesameApp, onSave }) => {
  const { t } = useTranslation();

  const infoItem = {
    display: 'flex',
    alignItems: 'center',
    px: 0,
    wordBreak: 'break-all',
    justifyContent: 'space-between',
    height: '40px',
  };

  if (isSesameApp) {
    return (
      <List
        disablePadding
        sx={{
          '> .css-1samsxy-MuiListItem-root': {
            padding: '0px',
          },
        }}
      >
        <ListItem sx={{ ...infoItem }}>
          <Typography variant="h4" sx={{ color: 'title.main' }}>
            {t('pages.sesameAccessControlDevice.index.Email')}
          </Typography>
          <Typography variant="h4" sx={{ color: 'info.light' }}>
            {data.employeeEmail ?? employeeEmail}
          </Typography>
        </ListItem>
        <Divider sx={{ opacity: 0.4 }} />
      </List>
    );
  }

  return (
    <List
      disablePadding
      sx={{
        '> .css-1samsxy-MuiListItem-root': {
          padding: '0px',
        },
      }}
    >
      <ListItem sx={{ ...infoItem }}>
        <Typography variant="h4" sx={{ color: 'title.main' }}>
          {t('pages.sesameAccessControlDevice.index.Email')}
        </Typography>
        <Typography variant="h4" sx={{ color: 'info.light' }}>
          {data.employeeEmail}
        </Typography>
      </ListItem>
      <Divider sx={{ opacity: 0.4 }} />
      <ListItem sx={{ ...infoItem }}>
        <Typography variant="h4" sx={{ color: 'title.main' }}>
          {t('deviceMember.nickName')}
        </Typography>
        <EditableText
          initialValue={data.employeeName}
          onSave={(newValue, callback) => {
            if (!newValue || !callback) {
              return;
            }
            onSave({ subUUID: data.subUUID, employeeName: newValue }, callback);
          }}
        />
      </ListItem>
      <Divider sx={{ opacity: 0.4 }} />
      <ListItem sx={{ ...infoItem }}>
        <Typography variant="h4" sx={{ color: 'title.main' }}>
          {t('pages.sesameAccessControlDevice.index.UUID')}
        </Typography>
        <Typography variant="h4" sx={{ color: 'info.light' }}>
          {data.subUUID}
        </Typography>
      </ListItem>
      <Divider sx={{ opacity: 0.4 }} />
      <ListItem sx={{ ...infoItem }}>
        <Typography variant="h4" sx={{ color: 'title.main' }}>
          ロール
        </Typography>
        <Typography variant="h4" sx={{ color: 'info.light' }}>
          {data.tag &&
            data.tag.map((tag, index) => {
              return <EmployeeRoleChip key={index} handleCheck={() => {}} label={tag} rowChipLength={1} />;
            })}
        </Typography>
      </ListItem>
      <Divider sx={{ opacity: 0.4 }} />
      <ListItem sx={{ ...infoItem }}>
        <Typography variant="h4" sx={{ color: 'title.main' }}>
          所属
        </Typography>
        <EditableText
          initialValue={data.department}
          onSave={(newValue, callback) => {
            if (!newValue || !callback) {
              return;
            }
            onSave({ subUUID: data.subUUID, department: newValue }, callback);
          }}
        />
      </ListItem>
      <Divider sx={{ opacity: 0.4 }} />
      <ListItem sx={{ ...infoItem }}>
        <Typography variant="h4" sx={{ color: 'title.main' }}>
          電話番号
        </Typography>
        <EditableText
          initialValue={data.phone}
          onSave={(newValue, callback) => {
            if (!newValue || !callback) {
              return;
            }
            onSave({ subUUID: data.subUUID, phone: newValue }, callback);
          }}
        />
      </ListItem>
    </List>
  );
};

export default UserBasicInfo;
