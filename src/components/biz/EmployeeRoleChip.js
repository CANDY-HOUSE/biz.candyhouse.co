import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Chip, Menu, MenuItem, ListItemText } from '@mui/material';

const EmployeeRoleChip = ({ handleCheck, label, rowChipLength }) => {
  const { t } = useTranslation();
  const roleKeys = { オーナー: 'owner', マネージャー: 'manager', ゲスト: 'guest' };
  const displayLabel = roleKeys[label] ? t(`deviceMember.role.${roleKeys[label]}`) : label;
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Chip style={{ margin: 1 }} label={displayLabel} onDelete={rowChipLength === 1 ? null : handleClick} />
      <Menu
        elevation={1}
        getcontentanchorel={null}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        MenuListProps={{ disablePadding: true }}
        id="customized-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleCheck();
            setAnchorEl(null);
          }}
        >
          <ListItemText primary={t('pages.ir.remote.delete')} />
        </MenuItem>
      </Menu>
    </>
  );
};

export default EmployeeRoleChip;
