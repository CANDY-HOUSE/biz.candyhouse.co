import React, { useState } from 'react';
import { Menu, MenuItem, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const DeleteMenuButton = ({ onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation();
    onDelete(event);
    handleMenuClose();
  };

  return (
    <>
      <IconButton
        onClick={handleMenuOpen}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseUp={(event) => event.stopPropagation()}
      >
        <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
      </IconButton>
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
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteClick}>削除</MenuItem>
      </Menu>
    </>
  );
};

export default DeleteMenuButton;
