import React, { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'irHintKeyEditHidden';

const readHidden = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * 按键网格下方的提示「长按可删除或重命名；按住拖拽可重新排序」，可 ✕ 关闭；
 * 关闭后记在本机（localStorage），所有遥控器都不再显示。
 *
 * @param {boolean} p.show  是否显示（有按键时）
 */
const KeyHints = ({ show }) => {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(readHidden);

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // 隐私模式等写不进去时只在本次隐藏
    }
  };

  if (!show || hidden) return null;

  return (
    <Box sx={{ width: '100%', boxSizing: 'border-box', px: 2, pt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'action.hover',
          borderRadius: '10px',
          pl: 1.5,
          pr: 0.5,
          py: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', color: 'text.secondary', '& svg': { fontSize: 18 } }}>
          <TouchAppOutlinedIcon />
        </Box>
        <Typography sx={{ flex: 1, fontSize: '13px', lineHeight: 1.4, color: 'text.secondary', py: 0.75 }}>
          {t('pages.ir.remote.hintKeyEdit')}
        </Typography>
        <IconButton size="small" aria-label="close" onClick={hide} sx={{ color: 'text.disabled' }}>
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default KeyHints;
