import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Box } from '@mui/material';

import siteIcon from '@assets/site-icon.png';
import { URLs } from '@constants/URLs';

const SideBarMenu = ({ location }) => {
  console.log({ location });
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <>
      <Box
        sx={{
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        aria-controls={Boolean(anchorEl) ? 'basic-menu' : undefined}
        aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
        component={Link}
        style={{ textDecoration: 'none', color: 'inherit' }}
        onClick={(event) => {
          setAnchorEl(event.currentTarget);
          window.open(URLs.url, '_blank');
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            borderRadius: '50%',
            mr: '8px',
          }}
        >
          <img src={siteIcon} width={30} height={30} alt="icon" />
        </Box>
      </Box>
    </>
  );
};

export default memo(SideBarMenu); // 防止重复渲染
