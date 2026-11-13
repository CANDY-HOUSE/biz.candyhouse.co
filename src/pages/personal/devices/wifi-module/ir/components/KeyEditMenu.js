import React, { useCallback, useRef, useState } from 'react';
import { Box, ButtonBase, Drawer, IconButton, InputBase, Typography } from '@mui/material';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { useTranslation } from 'react-i18next';

const groupSx = { bgcolor: 'background.paper', borderRadius: '14px', overflow: 'hidden' };
const rowSx = {
  width: '100%',
  height: 56,
  fontSize: '17px',
  justifyContent: 'center',
  '& + &': { borderTop: '1px solid', borderColor: 'divider' },
};

/**
 * 长按按键弹出的编辑弹窗（底部菜单样式）：同一个弹窗里改名保存、删除，不再弹第二个对话框。
 * 名称没改、为空、重名或该按键不支持改名时「保存」置灰；「删除」直接删除，不二次确认。
 *
 * @param {function} p.onRename    (item, name) => void   名称已去掉首尾空格、不为空、不重名
 * @param {function} p.onDelete    (item) => void
 * @param {function} p.canRename   (item) => boolean   返回 false 时输入框只读（空调的组合控件）
 * @param {function} p.getName     (item) => string    输入框里的初始名称
 * @param {function} p.isNameTaken (item, name) => boolean  可选，同一遥控器里已有同名按键
 * @returns {{ openMenu: (item) => void, menuElement: React.ReactNode }}
 */
export const useKeyEditMenu = ({ onRename, onDelete, canRename = () => true, getName, isNameTaken }) => {
  const { t } = useTranslation();
  const [state, setState] = useState({ open: false, item: null, name: '', initial: '' });
  const latest = useRef({});
  latest.current = { getName, canRename };

  const openMenu = useCallback((item) => {
    const initial = latest.current.getName ? latest.current.getName(item) : item?.title || '';
    setState({ open: true, item, name: initial, initial });
  }, []);
  // 只关不清：关闭动画期间内容保持不变
  const close = () => setState((prev) => ({ ...prev, open: false }));

  const { item, name, initial } = state;
  const editable = item ? canRename(item) : false;
  const trimmed = name.trim();
  const changed = trimmed !== initial.trim();
  let error = '';
  if (item && !editable) error = t('pages.ir.remote.cannotRename');
  else if (changed && !trimmed) error = t('pages.ir.remote.nameCannotBeEmpty');
  else if (changed && isNameTaken?.(item, trimmed)) error = t('pages.ir.remote.nameDuplicate');
  const canSave = editable && changed && !error;

  const handleSave = () => {
    if (!canSave) return;
    close();
    onRename(item, trimmed);
  };

  const handleDelete = () => {
    close();
    onDelete(item);
  };

  const menuElement = (
    <Drawer
      anchor="bottom"
      open={state.open}
      onClose={close}
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
          width: '100%',
          maxWidth: 480,
          mx: 'auto',
          left: 0,
          right: 0,
          boxSizing: 'border-box',
          px: 1.25,
          pb: 'max(10px, env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        },
      }}
    >
      <Box sx={groupSx}>
        <Typography
          sx={{
            py: 1.5,
            textAlign: 'center',
            fontSize: '13px',
            color: 'text.secondary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {t('pages.ir.remote.editKey')}
        </Typography>
        <Box sx={{ px: 1.75, pt: 1.5, pb: error ? 0.5 : 1.5 }}>
          <Box
            sx={{
              height: 46,
              borderRadius: '10px',
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              pl: 1.75,
              pr: 0.5,
              '&:focus-within': {
                bgcolor: 'background.paper',
                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
              },
            }}
          >
            <InputBase
              fullWidth
              value={name}
              readOnly={!editable}
              onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              inputProps={{ 'aria-label': t('pages.ir.remote.editKey'), enterKeyHint: 'done' }}
              sx={{ fontSize: '17px', color: editable ? 'text.primary' : 'text.disabled' }}
            />
            {editable && name && (
              <IconButton
                size="small"
                aria-label="clear"
                onClick={() => setState((prev) => ({ ...prev, name: '' }))}
                sx={{ color: 'text.disabled' }}
              >
                <CancelRoundedIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          {error && (
            <Typography
              sx={{ fontSize: '12px', color: editable ? 'error.main' : 'text.secondary', pt: 0.75, pb: 0.5, pl: 0.5 }}
            >
              {error}
            </Typography>
          )}
        </Box>
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <ButtonBase
            disabled={!canSave}
            onClick={handleSave}
            sx={{ ...rowSx, fontWeight: 600, color: canSave ? 'primary.main' : 'text.disabled' }}
          >
            {t('pages.ir.remote.save')}
          </ButtonBase>
          <ButtonBase onClick={handleDelete} sx={{ ...rowSx, color: 'error.main' }}>
            {t('pages.ir.remote.delete')}
          </ButtonBase>
        </Box>
      </Box>
      <Box sx={groupSx}>
        <ButtonBase onClick={close} sx={{ ...rowSx, fontWeight: 600, color: 'text.primary' }}>
          {t('pages.ir.remote.cancel')}
        </ButtonBase>
      </Box>
    </Drawer>
  );

  return { openMenu, menuElement };
};
