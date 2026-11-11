import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Popover,
  TextField,
} from '@mui/material';
import { Delete as DeleteIcon, MoreHoriz } from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';

/**
 * 按键右下角的「…」：点击展开「编辑名称」「删除」。放在按键格子里（格子需要 position: relative）。
 * 点它不会触发按键本身的发码。
 */
export const KeyMoreButton = ({ onClick }) => (
  <Box
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }}
    sx={{
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      borderRadius: '50%',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        transform: 'scale(1.1)',
        '& .menu-icon': {
          transform: 'scale(1.2)',
        },
      },
      '&:active': {
        transform: 'scale(0.95)',
        backgroundColor: 'rgba(0, 0, 0, 0.12)',
      },
    }}
  >
    <MoreHoriz
      className="menu-icon"
      sx={{
        fontSize: '18px',
        color: 'text.secondary',
        transition: 'all 0.2s ease-in-out',
      }}
    />
  </Box>
);

/**
 * 按键的「…」菜单和改名对话框。
 *
 * @param {function} p.onRename   (item, name) => void   名称已去掉首尾空格、不为空
 * @param {function} p.onDelete   (item) => void
 * @param {function} p.canRename  (item) => boolean   返回 false 时「编辑名称」置灰（空调的组合控件）
 * @param {function} p.getName    (item) => string    对话框里的初始名称
 * @param {function} p.onEmptyName () => void          名称为空时的提示
 * @returns {{ openMenu: (event, item) => void, menuElement: React.ReactNode }}
 */
export const useKeyEditMenu = ({ onRename, onDelete, canRename = () => true, getName, onEmptyName }) => {
  const { t } = useTranslation();
  const [menu, setMenu] = useState({ anchorEl: null, item: null });
  const [dialog, setDialog] = useState({ open: false, item: null, name: '' });

  const openMenu = useCallback((event, item) => {
    setMenu({ anchorEl: event.currentTarget, item });
  }, []);
  const closeMenu = () => setMenu({ anchorEl: null, item: null });
  const closeDialog = () => setDialog({ open: false, item: null, name: '' });

  const handleEdit = () => {
    const { item } = menu;
    closeMenu();
    setDialog({ open: true, item, name: getName ? getName(item) : item?.title || '' });
  };

  const handleDelete = () => {
    const { item } = menu;
    closeMenu();
    onDelete(item);
  };

  const handleSave = () => {
    const { item, name } = dialog;
    closeDialog();
    if (!name.trim()) {
      onEmptyName?.();
      return;
    }
    onRename(item, name.trim());
  };

  const renameEnabled = menu.item ? canRename(menu.item) : true;

  const menuElement = (
    <>
      <Popover
        anchorEl={menu.anchorEl}
        open={Boolean(menu.anchorEl)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { minWidth: 120, boxShadow: 3 } }}
      >
        <MenuItem onClick={handleEdit} disabled={!renameEnabled}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          {t('pages.ir.remote.edit')}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          {t('pages.ir.remote.delete')}
        </MenuItem>
      </Popover>

      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('pages.ir.remote.edit')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            variant="outlined"
            value={dialog.name}
            onChange={(e) => setDialog((prev) => ({ ...prev, name: e.target.value }))}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t('pages.ir.remote.cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {t('pages.ir.remote.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  return { openMenu, menuElement };
};
