import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import React, { useState } from 'react';
import { Box, styled, Typography } from '@mui/material';
import { CfpBindMM } from './CfpBindMember';
import { LoadingButton } from '@mui/lab';

const DgBindMember = styled(Dialog)({
  '& .MuiDialog-paper': {
    width: '80%',
    height: 'auto',
    borderRadius: '6px',
    margin: 'auto',
  },
});

const DgSureCanle = ({ isLoading, handleClose, handleSure }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        mt: '10px',
        marginRight: '20px',
        marginBottom: '20px',
      }}
    >
      <Button onClick={handleClose} size="small" sx={{ mr: '10px 20px' }}>
        キャンセル
      </Button>
      <LoadingButton disableElevation loading={isLoading} size="small" variant="outlined" onClick={handleSure}>
        確認
      </LoadingButton>
    </Box>
  );
};

export const CfpDgBindMember = ({ mOpen, handleClose, handleSure, defaultVal }) => {
  const [mm, setMm] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  return (
    <DgBindMember open={mOpen} onClose={handleClose}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          m: '32px 32px 10px 32px',
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: '22px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            paddingBottom: '20px',
          }}
        >
          ユーザーを紐付け
        </Typography>
        <CfpBindMM
          defaultVal={defaultVal}
          callBindMm={(data) => {
            setMm(data);
          }}
        />
      </Box>
      <DgSureCanle
        isLoading={isLoading}
        handleClose={handleClose}
        handleSure={() => {
          setIsLoading(true);
          handleSure(mm, (_suc) => {
            setIsLoading(false);
          });
        }}
      />
    </DgBindMember>
  );
};
