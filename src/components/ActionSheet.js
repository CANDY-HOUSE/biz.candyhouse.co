import React from 'react';
import { Drawer, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * iOS 风格底部 actionSheet（基于 MUI Drawer 抽屉，带滑入动画/遮罩）
 * @param {boolean} open        是否显示
 * @param {string}  title       标题（灰字）
 * @param {string}  confirmText 确定项文案（默认 setting.delete = "OK"）
 * @param {string}  confirmColor 确定项颜色（默认破坏性红）
 * @param {Function} onConfirm  点击确定
 * @param {Function} onClose    点击取消 / 遮罩
 */
const ActionSheet = ({ open, title, confirmText, confirmColor = '#FF3B30', onConfirm, onClose }) => {
  const { t } = useTranslation();

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
          p: '8px',
          pb: 'calc(8px + env(safe-area-inset-bottom))',
        },
      }}
    >
      {/* 操作卡片 */}
      <Box
        sx={{
          mb: '8px',
          borderRadius: '14px',
          overflow: 'hidden',
          bgcolor: 'rgba(248,248,248,0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {title && (
          <Box
            sx={{
              px: 2,
              py: 1.25,
              textAlign: 'center',
              fontSize: '13px',
              color: 'rgba(60,60,67,0.6)',
              borderBottom: '0.5px solid rgba(60,60,67,0.29)',
            }}
          >
            {title}
          </Box>
        )}
        <Box
          onClick={onConfirm}
          sx={{ py: '16px', textAlign: 'center', fontSize: '20px', color: confirmColor, cursor: 'pointer' }}
        >
          {confirmText || t('setting.delete')}
        </Box>
      </Box>

      {/* 取消卡片 */}
      <Box
        onClick={onClose}
        sx={{
          borderRadius: '14px',
          bgcolor: '#fff',
          py: '16px',
          textAlign: 'center',
          fontSize: '20px',
          fontWeight: 600,
          color: '#007AFF',
          cursor: 'pointer',
        }}
      >
        {t('setting.cancel')}
      </Box>
    </Drawer>
  );
};

export default ActionSheet;
