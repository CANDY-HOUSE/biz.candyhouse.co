import React, { useContext, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { IconButton, Menu, MenuItem } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';

export default function TagAccessAdd({ tag, changeSingleAccess, appAccessTags }) {
  const { gStripe } = useContext(GlobalStateContext);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  return (
    <>
      <IconButton size="small" onClick={handleClick}>
        <AddCircleIcon htmlColor={'gray'} />
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
        onClose={handleClose}
      >
        {appAccessTags
          .filter((option) => !tag.access.includes(option) && option !== '権限なし')
          .map((option) => (
            <MenuItem
              key={option}
              onClick={(e) => {
                e.stopPropagation();
                setAnchorEl(null);
                changeSingleAccess(
                  {
                    ...tag,
                    access: [...tag.access, option],
                  },
                  gStripe.customerInfo.companyID
                );
              }}
            >
              {option}
            </MenuItem>
          ))}
      </Menu>
    </>
  );
}
