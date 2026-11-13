import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, IconButton, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useTranslation } from 'react-i18next';
import irLearnImage from '@/assets/svg/ir/png_ir_match.png';

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(229, 72, 77, 0.35); }
  70% { box-shadow: 0 0 0 10px rgba(229, 72, 77, 0); }
  100% { box-shadow: 0 0 0 0 rgba(229, 72, 77, 0); }
`;

/** 学习说明图层：示意图 + 说明文字，点「知道了」、✕ 或遮罩关闭 */
export const LearnGuideDialog = ({ open, onClose }) => {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '20px', mx: 3, px: 2.75, pt: 3.25, pb: 2.25, textAlign: 'center', position: 'relative' },
      }}
    >
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{ position: 'absolute', top: 8, right: 8, color: 'text.disabled' }}
      >
        <CloseRoundedIcon />
      </IconButton>
      <Box component="img" src={irLearnImage} alt="" sx={{ width: '100%', height: 150, objectFit: 'contain' }} />
      <Typography sx={{ mt: 2.25, fontSize: '16px', lineHeight: 1.7, color: 'title.main' }}>
        {t('pages.ir.remote.learnGuide')}
      </Typography>
      <Button
        fullWidth
        variant="contained"
        disableElevation
        onClick={onClose}
        sx={{
          mt: 2.5,
          height: 46,
          borderRadius: '23px',
          fontSize: '16px',
          fontWeight: 600,
          color: '#fff',
          bgcolor: 'primary.main',
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        {t('pages.ir.remote.gotIt')}
      </Button>
    </Dialog>
  );
};

/**
 * 按键网格最后一格「学习新按键」：点击进入 / 退出学习模式；右上角叹号弹出学习说明图层。
 * 点击进入学习时同时弹出说明图层；退出学习模式（无论从哪里退出）时，图层还开着就一并关闭。
 *
 * @param {boolean}  p.learning  是否处于学习模式（显示「退出学习」）
 * @param {function} p.onClick   点击格子（切换学习模式）
 * @param {boolean}  p.showGuide 是否显示叹号并在进入学习时弹出说明（页面已有说明图时传 false）
 */
const LearnKeyCell = ({ learning, onClick, showGuide = true }) => {
  const { t } = useTranslation();
  const [guideOpen, setGuideOpen] = useState(false);

  // 学习模式由 Hub 回报异步变化：从学习中变为非学习时关闭说明图层
  const wasLearning = useRef(learning);
  useEffect(() => {
    if (wasLearning.current && !learning) setGuideOpen(false);
    wasLearning.current = learning;
  }, [learning]);

  const handleClick = () => {
    if (!learning && showGuide) setGuideOpen(true);
    onClick?.();
  };

  return (
    <>
      <Box
        role="button"
        onClick={handleClick}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          position: 'relative',
          cursor: 'pointer',
          color: learning ? 'error.main' : 'primary.main',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          '&:active': { opacity: 0.5 },
        }}
      >
        <Box
          sx={(theme) => ({
            width: 34,
            height: 34,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(learning ? theme.palette.error.main : theme.palette.primary.main, 0.1),
            animation: learning ? `${pulse} 1.6s ease-out infinite` : 'none',
          })}
        >
          {learning ? <CloseRoundedIcon fontSize="small" /> : <AddRoundedIcon />}
        </Box>
        <Typography
          sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, fontWeight: 600, textAlign: 'center', px: 1, lineHeight: 1.2 }}
        >
          {learning ? t('pages.ir.remote.exitLearn') : t('pages.ir.remote.learnNewKey')}
        </Typography>
        {showGuide && (
          <IconButton
            size="small"
            aria-label="learn guide"
            onClick={(e) => {
              e.stopPropagation();
              setGuideOpen(true);
            }}
            sx={{ position: 'absolute', top: 4, right: 4, color: 'primary.main' }}
          >
            <ErrorOutlineRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <LearnGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
};

export default LearnKeyCell;
