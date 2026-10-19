import React, { useContext, useEffect, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InfoIcon from '@mui/icons-material/Info';

// 编辑 / 保存：纯文字，紧贴输入框右侧（去掉 Button 默认 64px 最小宽度带来的空隙）
const actionButtonSx = { minWidth: 'auto', marginLeft: '4px', paddingX: '6px', whiteSpace: 'nowrap' };

// 与开发者页「デモ」的说明提示同款
const CustomWidthTooltip = styled(({ className, ...props }) => <Tooltip {...props} classes={{ popper: className }} />)({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 500,
  },
});

export default function WebhookCard() {
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
          msg: `保存に失敗しました：${res.message || 'エラーが発生しました'}`,
        });
        return;
      }
      setIsEditing(false);
      setShowUrl(false);
      setSnackbarValue({ open: true, msg: '保存しました' });
    });
  };

  return (
    <Card>
      <CardHeader title={<Typography variant="h3">Webhook</Typography>} />
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', paddingTop: '6px' }}>
          <Typography variant="h3" sx={{ fontWeight: 'normal' }}>
            通知先 URL
          </Typography>
          <CustomWidthTooltip
            title={
              <div>
                デバイスの状態（施錠・解錠・オンライン・電池など）が変化すると、指定した URL に POST で通知します。
                <br />
                署名には上記の API キーを使用します（X-Candyhouse-Signature）。
              </div>
            }
            placement="right-start"
          >
            <InfoIcon sx={{ color: '#cccccc', cursor: 'pointer', ml: '5px' }} />
          </CustomWidthTooltip>
        </Box>
      </CardContent>
      <CardContent sx={{ paddingBottom: 'unset' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <TextField
            size="small"
            label="Webhook URL（https）"
            variant="filled"
            fullWidth
            sx={{ flexGrow: '1' }}
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
              保存
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
              編集
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
