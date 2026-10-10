import { IconButton } from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useTranslation } from 'react-i18next';

/** Shared by desktop, mobile and Android H5 headers; callers retain their navigation action. */
export default function BackButton({ children, sx, ...props }) {
  const { t } = useTranslation();
  return (
    <IconButton
      aria-label={t('pages.login.ReturnToMailInput')}
      disableRipple
      {...props}
      sx={[...(Array.isArray(sx) ? sx : [sx]), { minWidth: 48, minHeight: 48, p: 1, color: 'rgba(0, 0, 0, 0.87)' }]}
    >
      <KeyboardArrowLeftIcon sx={{ width: 24, height: 24, flexShrink: 0 }} />
      {children}
    </IconButton>
  );
}
