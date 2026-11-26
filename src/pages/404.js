import * as React from 'react';
import { Grid2, Card, CardContent, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFoundPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Grid2
      container
      spacing={1}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: 1,
      }}
    >
      <Card sx={{ minWidth: 275 }}>
        {' '}
        {/* 控制卡片的最小宽度以更好地控制布局 */}
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Typography>{t('admin.notFound.noPermission')}</Typography>
          <Button
            onClick={() => {
              navigate(`/`);
            }}
          >
            {t('admin.notFound.backHome')}
          </Button>
        </CardContent>
      </Card>
    </Grid2>
  );
};

export default NotFoundPage;
