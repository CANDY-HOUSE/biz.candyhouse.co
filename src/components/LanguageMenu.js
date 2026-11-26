import { useState } from 'react';
import { Box, ButtonBase, Menu, MenuItem, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import { useTranslation } from 'react-i18next';
import { chooseLanguage, languages } from '@/i18n';
import { ios } from '@/theme/appHomeStyle';

export default function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const [anchor, setAnchor] = useState(null);
  const current = languages.find((language) => language.code === i18n.language) || languages[0];
  const open = (event) => {
    event.stopPropagation();
    setAnchor(event.currentTarget);
  };
  const trigger = (
    <ButtonBase
      onClick={open}
      aria-label={t('language.title')}
      sx={{ gap: '6px', px: '12px', height: 36, borderRadius: '18px', '&:hover': { bgcolor: ios.fill } }}
    >
      <LanguageRoundedIcon sx={{ fontSize: 20, color: ios.secondaryLabel }} />
      <Typography sx={{ fontSize: 16 }}>{current.label}</Typography>
    </ButtonBase>
  );
  return (
    <>
      {trigger}
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 180, borderRadius: '12px' } } }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            lang={language.code}
            selected={language.code === current.code}
            onClick={() => {
              setAnchor(null);
              chooseLanguage(language.code);
            }}
            sx={{ gap: '8px' }}
          >
            <Box sx={{ width: 20, display: 'flex' }}>
              {language.code === current.code && <CheckIcon sx={{ fontSize: 18, color: ios.tint }} />}
            </Box>
            {language.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
