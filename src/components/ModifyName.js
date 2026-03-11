import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useTranslation } from 'react-i18next';

const ModifyName = ({ title, value, onConfirm, onCancel }) => {
  const [nameValue, setNameValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleConfirm = () => {
    setIsLoading(true);
    onConfirm(nameValue, (_res) => {
      setIsLoading(false);
    });
  };

  const handleCancel = () => {
    setNameValue('');
    onCancel();
    setIsLoading(false);
  };

  return (
    <Box>
      {title && <Typography sx={{ pb: 1 }}>{title}</Typography>}

      <Box
        fullWidth="true"
        sx={{
          display: 'flex',
          mt: '5px',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TextField
          required
          size="small"
          sx={{
            borderRadius: '5px',
            width: '60%',
          }}
          value={nameValue}
          onChange={(e) => {
            setNameValue(e.target.value);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mt: '10px',
        }}
      >
        <Button disabled={isLoading} size="small" onClick={handleCancel}>
          {t('deviceMember.opt.cancel')}
        </Button>
        <LoadingButton
          loading={isLoading}
          disableElevation
          size="small"
          variant="outlined"
          disabled={nameValue?.length === 0 || nameValue === value}
          onClick={handleConfirm}
        >
          {t('deviceMember.opt.ok')}
        </LoadingButton>
      </Box>
    </Box>
  );
};

export default ModifyName;
