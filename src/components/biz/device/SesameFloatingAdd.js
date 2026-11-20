import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Fab, Dialog, IconButton, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

const SesameFloatingAdd = forwardRef(({ children, popupComponent, isMobile = false, onClose, fabSx }, ref) => {
  const [open, setOpen] = useState(false);
  const shouldShowButton = isMobile && popupComponent;

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    onClose && onClose();
  };

  useImperativeHandle(
    ref,
    () => ({
      handleClose,
      handleOpen,
    }),
    [open]
  );

  return (
    <>
      {children}
      {shouldShowButton && (
        <Fab
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            bgcolor: 'rgba(255,255,255,0.3)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.5)',
            },
            boxShadow: '0 6px 20px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.08)',
            ...fabSx,
          }}
        >
          <AddIcon color="primary" />
        </Fab>
      )}
      {popupComponent && (
        <Dialog
          open={open}
          onClose={handleClose}
          PaperProps={{
            sx: {
              minWidth: isMobile ? '280px' : '60%',
              width: '90%',
              maxHeight: '65%',
              bgcolor: 'background.paper',
              borderRadius: '5px',
              padding: 0,
              overflow: 'auto',
            },
          }}
        >
          <Box sx={{ position: 'relative', p: 2 }}>
            <IconButton
              onClick={handleClose}
              sx={{
                position: 'absolute',
                right: 0,
                top: 0,
                zIndex: 1,
              }}
            >
              <CloseIcon />
            </IconButton>
            {popupComponent}
          </Box>
        </Dialog>
      )}
    </>
  );
});

export default SesameFloatingAdd;
