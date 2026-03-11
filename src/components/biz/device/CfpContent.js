import { Box, Typography, Stack } from '@mui/material';
import React from 'react';
import { gUtils } from '@/utils/gUtils';
import { gConfig } from '@constants/gConfig';
import { useTranslation } from 'react-i18next';

const CfpContentCount = ({ count, onClick, name, isShow = true }) => {
  return (
    <>
      {isShow && (
        <Box
          sx={{
            width: '100%',
            borderRadius: '6px',
            backgroundColor: 'secondary.light',
            padding: '10px',
            flexDirection: 'column',
            display: 'flex',
            alignItems: 'baseline',
            cursor: 'pointer',
            '&:hover': {
              opacity: '0.6',
            },
          }}
          onClick={onClick}
        >
          <Typography
            sx={{
              fontFamily: "'Noto Sans JP', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: '27.24px',
              letterSpacing: '0.06em',
            }}
          >
            {name}
          </Typography>

          <Box sx={{ display: 'flex' }}>
            <Typography
              sx={{
                fontFamily: "'Noto Sans JP', sans-serif",
                fontSize: typeof count === 'string' ? '20px' : '60px',
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              {count}
            </Typography>
          </Box>
        </Box>
      )}
    </>
  );
};
export default function CfpContent({ cc, pc, call, model, isMobile = false }) {
  const { t } = useTranslation(); // i18n
  return (
    <>
      <Box sx={{ p: 2 }}>
        <Typography
          sx={{
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '31px',
            letterSpacing: '0.06em',
          }}
        >
          登録内容
        </Typography>

        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ p: '18px 18px 18px 0' }}>
          <CfpContentCount
            count={cc}
            name={t('accessCtl.auth.card')}
            onClick={() => call(gConfig.sesameTouchProAuthType.card)}
            isShow={gUtils.isShowType(model, gConfig.sesameTouchProAuthType.card)}
          />
          <CfpContentCount
            count={pc}
            name={t('accessCtl.auth.password')}
            onClick={() => call(gConfig.sesameTouchProAuthType.password)}
            isShow={gUtils.isShowType(model, gConfig.sesameTouchProAuthType.password)}
          />
          <CfpContentCount
            count={'Coming soon'}
            name={t('accessCtl.auth.fingerprint')}
            onClick={() => {}}
            isShow={gUtils.isShowType(model, gConfig.sesameTouchProAuthType.finger)}
          />
          <CfpContentCount
            count={'Coming soon'}
            name={t('accessCtl.auth.face')}
            onClick={() => {}}
            isShow={gUtils.isShowType(model, gConfig.sesameTouchProAuthType.face)}
          />
          <CfpContentCount
            count={'Coming soon'}
            name={t('accessCtl.auth.palm')}
            onClick={() => {}}
            isShow={gUtils.isShowType(model, gConfig.sesameTouchProAuthType.palm)}
          />
          {/* <CfpContentCount
            count={fc}
            name="指紋数"
            onClick={() => call(gConfig.sesameTouchProAuthType.finger)}
            isShow={gUtils.isShowType(model, gConfig.sesameTouchProAuthType.finger)}
            number={fpCount}
          />
          /*
          <CfpContentCount
            count={faceCount}
            name="人脸"
            onClick={() => call(gConfig.sesameTouchProAuthType.face)}
            isShow={gUtils.isShowType(model, gConfig.sesameTouchProAuthType.face)}
            number={pwCount}
          />
          <CfpContentCount
            count={palmCount}
            name="手掌"
            onClick={() => call(gConfig.sesameTouchProAuthType.palm)}
            isShow={gUtils.isShowType(model, gConfig.sesameTouchProAuthType.palm)}
            number={pwCount}
          /> */}
        </Stack>
      </Box>
    </>
  );
}
