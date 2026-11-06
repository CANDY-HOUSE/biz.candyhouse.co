import React, { useState } from 'react';
import { Button, Dialog, Divider, ListItem, ListItemText, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { requestNative } from '@/services/appBridge';

const LOCK_MODELS = [
  'sesame_2',
  'sesame_4',
  'sesame_5',
  'sesame_5_pro',
  'sesame_5_us',
  'sesame_6',
  'sesame_6_pro',
  'sesame_6_pro_slidingdoor',
  'sesame_miwa',
];
const BOT_MODELS = ['ssmbot_1', 'bot_2', 'bot_3'];
const BIKE_MODELS = ['bike_1', 'bike_2', 'bike_3'];

// Operations the APP's Siri actions support for each model.
export const voiceShortcutOperations = (model) => {
  if (LOCK_MODELS.includes(model)) return ['toggle', 'lock', 'unlock'];
  if (BOT_MODELS.includes(model)) return ['toggle'];
  if (BIKE_MODELS.includes(model)) return ['unlock'];
  return [];
};

export default function AppVoiceShortcut({ deviceUUID, deviceModel }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const operations = voiceShortcutOperations(deviceModel);
  if (!operations.length) return null;

  const addToSiri = (operation) => {
    setOpen(false);
    requestNative('voiceShortcut', { deviceUUID, operation }).catch(() => {});
  };

  return (
    <>
      <ListItem onClick={() => setOpen(true)}>
        <ListItemText primary={t('pages.sesameAccessControlDevice.index.SiriCustomPhrase')} />
      </ListItem>
      <Divider variant="middle" sx={{ opacity: 0.4 }} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { borderRadius: '28px', width: 'min(320px, calc(100% - 32px))', m: 2, p: 2.5 } }}
      >
        <Stack spacing={1.5}>
          {operations.map((operation) => (
            <Button
              key={operation}
              onClick={() => addToSiri(operation)}
              sx={{
                borderRadius: '999px',
                py: 1.5,
                bgcolor: 'grey.200',
                color: 'text.primary',
                fontWeight: 'bold',
                fontSize: 17,
                textTransform: 'none',
                '&:hover': { bgcolor: 'grey.300' },
              }}
            >
              {t(`voiceShortcut.${operation}`)}
            </Button>
          ))}
        </Stack>
      </Dialog>
    </>
  );
}
