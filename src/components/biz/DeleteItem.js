import React from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import { Menu, MenuItem, IconButton, ListItemText } from '@mui/material';
import Hider from '@/components/biz/Hider';

export default function DeleteItem({ handleCheck, employeeRole }) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Hider show={employeeRole === 'Owner'}>
        <IconButton size="small" disabled>
          <DeleteIcon fontSize="small" sx={{ color: 'disabled' }} />
        </IconButton>
        <IconButton size="small" onClick={handleClick} color="inherit">
          <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
        </IconButton>
      </Hider>
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
          onClick={() => {
            handleCheck();
            setAnchorEl(null);
          }}
        >
          <ListItemText primary="削除" />
        </MenuItem>
      </Menu>
    </>
  );
}
