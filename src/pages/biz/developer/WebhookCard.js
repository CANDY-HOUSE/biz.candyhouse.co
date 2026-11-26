import React, { useContext, useEffect, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Button, IconButton, InputAdornment, TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InfoIcon from '@mui/icons-material/Info';
import { useTranslation } from 'react-i18next';
import { PcRow, PcSection, pcFieldSx } from '@/components/PcGrouped';
import { ios } from '@/theme/appHomeStyle';

// 编辑 / 保存：纯文字，紧贴输入框右侧（去掉 Button 默认 64px 最小宽度带来的空隙）
const actionButtonSx = { minWidth: 'auto', mr: '-6px', paddingX: '6px', whiteSpace: 'nowrap' };

// 与开发者页「デモ」的说明提示同款
const CustomWidthTooltip = styled(({ className, ...props }) => <Tooltip {...props} classes={{ popper: className }} />)({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 500,
  },
});

export default function WebhookCard() {
  const { t } = useTranslation();
  const { gStripe, setSnackbarValue } = useContext(GlobalStateContext);
  const savedUrl = gStripe.apiKey.webhook?.url || '';
  const [url, setUrl] = useState(savedUrl);
  const [showUrl, setShowUrl] = useState(false);
  const [pending, setPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setUrl(savedUrl);
  }, [savedUrl]);

  // 空值 = 停止推送，可直接保存；否则必须以 https:// 开头
  const isUrlValid = !url.trim() || /^https:\/\//i.test(url.trim());

  const save = () => {
    // 未改动直接退出编辑
    if (url.trim() === savedUrl) {
      setIsEditing(false);
      setShowUrl(false);
      return;
    }
    setPending(true);
    // 空值即删除配置（不再推送）
    gStripe.updateWebhook(url.trim(), (res) => {
      setPending(false);
      if (!res.success) {
        setSnackbarValue({
          open: true,
          severity: 'error',
          msg: t('admin.webhook.saveFailed', { message: res.message || t('admin.webhook.unknownError') }),
        });
        return;
      }
      setIsEditing(false);
      setShowUrl(false);
      setSnackbarValue({ open: true, msg: t('admin.webhook.saved') });
    });
  };

  return (
    <PcSection title="Webhook">
      <PcRow
        label={
          <>
            {t('admin.webhook.notifyUrl')}
            <CustomWidthTooltip
              title={
                <div>
                  {t('admin.webhook.hintStateChange')}
                  <br />
                  {t('admin.webhook.hintSignature')}
                </div>
              }
              placement="right-start"
            >
              <InfoIcon sx={{ fontSize: 18, color: ios.tertiaryLabel, cursor: 'pointer', ml: '6px' }} />
            </CustomWidthTooltip>
          </>
        }
      />
      <PcRow sx={{ pt: 0, pb: '12px' }}>
        <TextField
          size="small"
          label="Webhook URL（https）"
          variant="filled"
          fullWidth
          sx={pcFieldSx}
          type={showUrl ? 'text' : 'password'}
          autoComplete="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          InputProps={{
            // 用 readOnly 而非 disabled：非编辑态外观与下方「デモ」的输入框一致
            readOnly: !isEditing,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShowUrl((v) => !v)}>
                  {showUrl ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {isEditing ? (
          <Button variant="text" sx={actionButtonSx} disabled={pending || !isUrlValid} onClick={save}>
            {t('admin.webhook.save')}
          </Button>
        ) : (
          <Button
            variant="text"
            sx={actionButtonSx}
            onClick={() => {
              setIsEditing(true);
              setShowUrl(true);
            }}
          >
            {t('admin.webhook.edit')}
          </Button>
        )}
      </PcRow>
    </PcSection>
  );
}
