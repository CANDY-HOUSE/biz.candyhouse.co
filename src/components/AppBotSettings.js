import { useState } from 'react';
import { Box, Divider, IconButton, ListItem, ListItemText, SvgIcon, Typography } from '@mui/material';
import { ArrowRight, ArrowDropDown } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SvgArrow } from '@/assets/svg/svgLock';
import { useBotScripts } from '@/hooks/useBotScripts';
import LockSettingWheel from './LockSettingWheel';
import { lockSettingsInteraction } from './lockSettingsInteraction';

export default function AppBotSettings({ deviceUUID }) {
  const bot = useBotScripts(deviceUUID);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const scriptName = (id) => bot.scripts.find((row) => row.id === id)?.name.replace(/^🎬\s*/, '');
  // The selected name sizes every row, so the centered heading and wheel share one icon/text origin.
  const scriptLabel = (id, showArrow = false) => (
    <Box
      component="span"
      sx={{
        display: 'block',
        position: 'relative',
        width: 'fit-content',
        maxWidth: '100%',
        mx: 'auto',
        pl: '22px',
        boxSizing: 'border-box',
        fontSize: 17,
        lineHeight: '30px',
        textAlign: 'left',
      }}
    >
      <Box
        component="span"
        aria-hidden="true"
        sx={{ display: 'flex', alignItems: 'center', gap: '2px', visibility: 'hidden' }}
      >
        <Box component="span" sx={{ width: 20, flexShrink: 0 }}>
          🎬
        </Box>
        <Box component="span" sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {scriptName(bot.selected)}
        </Box>
      </Box>
      {showArrow && (
        <Box component="span" sx={{ position: 'absolute', left: 0, top: 0, display: 'flex', width: 24 }}>
          {open ? <ArrowDropDown sx={{ fontSize: 30 }} /> : <ArrowRight sx={{ fontSize: 30 }} />}
        </Box>
      )}
      <Box
        component="span"
        sx={{
          position: 'absolute',
          left: 22,
          top: 0,
          right: showArrow ? 0 : 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
        }}
      >
        <Box component="span" sx={{ width: 20, flexShrink: 0 }}>
          🎬
        </Box>
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {scriptName(id)}
        </Box>
      </Box>
    </Box>
  );
  return (
    <Box sx={lockSettingsInteraction}>
      <ListItem sx={{ display: 'grid', gridTemplateColumns: '1fr minmax(0, 2fr) 1fr' }}>
        <ListItemText primary={t('botSettings.script')} />
        <Box
          component="button"
          onClick={() => setOpen(!open)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            mx: 'auto',
            p: 0,
            minWidth: 0,
            border: 0,
            bgcolor: 'transparent',
            color: 'text.secondary',
            font: 'inherit',
          }}
        >
          {scriptLabel(bot.selected, true)}
        </Box>
        <IconButton
          sx={{ justifySelf: 'end', mr: -1 }}
          disableRipple
          onClick={() =>
            navigate({ pathname: '/device-setting/bot-script', search: `${location.search}&index=${bot.selected}` })
          }
        >
          <SvgIcon component={SvgArrow} />
        </IconButton>
      </ListItem>
      {failed && <Typography color="error">{t('lockSettings.failed')}</Typography>}
      {open && (
        <LockSettingWheel
          title={t('botSettings.script')}
          values={bot.scripts.map((row) => row.id)}
          value={bot.selected}
          label={(id) => (
            <Box component="span" sx={{ display: 'grid', gridTemplateColumns: '1fr minmax(0, 2fr) 1fr', px: 2 }}>
              <Box component="span" sx={{ gridColumn: 2, minWidth: 0 }}>
                {scriptLabel(id)}
              </Box>
            </Box>
          )}
          disabled={busy || !bot.connected}
          onChange={async (index) => {
            setBusy(true);
            setFailed(false);
            try {
              await bot.select(index);
              setOpen(false);
            } catch (_) {
              setFailed(true);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      <Divider variant="middle" sx={{ opacity: 0.4 }} />
    </Box>
  );
}
