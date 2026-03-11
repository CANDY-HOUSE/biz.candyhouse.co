import React, { useContext, useEffect } from 'react';
import { Modal, Box, Typography } from '@mui/material';
import { GlobalStateContext } from '@context/GlobalContextProvider';

// 为组件命名
const CustomModal = ({ open, onClose, children, title }) => {
  const { modalTitle, setModalTitle, gMediaType } = useContext(GlobalStateContext);
  const isMobile = gMediaType.isMobile;

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    minWidth: isMobile ? '280px' : '550px',
    width: isMobile ? '90%' : 'auto',
    bgcolor: 'background.paper',
    borderRadius: '5px',
    border: 'none',
    outline: 'none',
    padding: isMobile ? '12px' : '16px',
  };

  useEffect(() => {
    if (!open) {
      setModalTitle('');
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography
          sx={{
            fontSize: isMobile ? 16 : 18,
            fontWeight: 'bold',
            wordBreak: 'break-word',
          }}
        >
          {modalTitle} {title}
        </Typography>
        {children}
      </Box>
    </Modal>
  );
};

export default CustomModal;
