import React, { useState } from 'react';
import { Box, Divider, ListItem, ListItemText, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import LockSettingsSlider from '../LockSettingsSlider';
import { deviceService, isAppHome } from '@/services/deviceService';

/**
 * Face3 设置页的「感应与声音」分组：雷达侦查距离（设置页原有的那一项，由 radar 传入）、
 * PIR 灵敏度（低 / 中 / 高）、喇叭音量（0–100）。
 *
 * PIR 和喇叭音量目前只有界面，选了不下发：门铃固件还没有对应的设置接口（PIR 阈值写死在 6629 的
 * app_pir.h，喇叭音量写死在 T32 的 audio_out.c）。接口定了之后接上下发。
 * 默认值对应固件现状：PIR 阈值 32 →「中」，喇叭音量 80。
 */

const PIR_LEVELS = ['low', 'medium', 'high'];

export default function Face3DeviceSettings({ radar }) {
  const { t } = useTranslation();
  const [pirLevel, setPirLevel] = useState('medium');
  const [volume, setVolume] = useState(80);

  return (
    <>
      <Typography sx={{ bgcolor: 'secondary.main', color: 'text.secondary', px: 2, pt: 4, pb: 1, fontSize: 13 }}>
        {t('face3.settings.group')}
      </Typography>
      {radar && (
        <>
          {radar}
          <Divider variant="middle" sx={{ opacity: 0.4 }} />
        </>
      )}
      <ListItem sx={{ minHeight: 53, gap: 2 }}>
        <ListItemText primary={t('face3.settings.pirSensitivity')} />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={pirLevel}
          onChange={(_, level) => level && setPirLevel(level)}
          aria-label={t('face3.settings.pirSensitivity')}
        >
          {PIR_LEVELS.map((level) => (
            <ToggleButton key={level} value={level} sx={{ px: 2 }}>
              {t(`face3.settings.level.${level}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </ListItem>
      <Typography sx={{ px: 2, pb: 2, fontSize: 13, color: 'text.secondary' }}>
        {t('face3.settings.pirHint')}
      </Typography>
      <Divider variant="middle" sx={{ opacity: 0.4 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 2 }}>
        <Typography sx={{ flexShrink: 0 }}>{t('face3.settings.speakerVolume')}</Typography>
        <LockSettingsSlider
          min={0}
          max={100}
          value={volume}
          valueLabelDisplay="auto"
          aria-label={t('face3.settings.speakerVolume')}
          onChange={(_, value) => {
            if (value !== volume && isAppHome) deviceService.notify('haptic');
            setVolume(value);
          }}
        />
      </Box>
    </>
  );
}
