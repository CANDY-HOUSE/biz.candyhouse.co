import React, { useState, useContext } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Chip, Menu, MenuItem, ListItemText } from '@mui/material';
import { AccessLabel } from '@/utils/accessLabels';
import { useTranslation } from 'react-i18next';

const RoleAccessChip = ({ handleCheck, label, isShowAdd }) => {
  const { gStripe } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      {gStripe.customerInfo.access && (
        <Chip style={{ margin: 1 }} label={<AccessLabel id={label} />} onDelete={isShowAdd ? handleCheck : undefined} />
      )}
      <Menu
        elevation={1}
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

export default RoleAccessChip;
