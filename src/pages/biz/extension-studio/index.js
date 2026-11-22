import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const STORAGE_KEY = 'sesame_extension_studio_v1';
const STARTER = {
  name: 'My Sesame Extension',
  version: '1.0.0',
  description: 'Describe what this extension should do.',
  triggers: [{ type: 'manual', name: '手動実行' }],
  actions: [{ type: 'log', message: 'Extension started' }],
};

function validateDefinition(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['ルートはJSONオブジェクトにしてください。'];
  if (!value.name || typeof value.name !== 'string') errors.push('name は必須の文字列です。');
  if (!value.version || typeof value.version !== 'string') errors.push('version は必須の文字列です。');
  if (!Array.isArray(value.triggers)) errors.push('triggers は配列にしてください。');
  if (!Array.isArray(value.actions)) errors.push('actions は配列にしてください。');
  if (Array.isArray(value.actions)) {
    value.actions.forEach((action, index) => {
      if (!action || typeof action !== 'object' || Array.isArray(action)) errors.push(`actions[${index}] はオブジェクトにしてください。`);
      else if (typeof action.type !== 'string' || !action.type.trim()) errors.push(`actions[${index}].type がありません。`);
    });
  }
  return errors;
}

export default function ExtensionStudio() {
  const [definitionText, setDefinitionText] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || JSON.stringify(STARTER, null, 2);
    } catch (error) {
      return JSON.stringify(STARTER, null, 2);
    }
  });
  const [requirements, setRequirements] = useState('');
  const [notice, setNotice] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(definitionText);
      return { value, errors: validateDefinition(value), syntaxError: '' };
    } catch (error) {
      return { value: null, errors: [], syntaxError: error.message };
    }
  }, [definitionText]);

  const valid = !parsed.syntaxError && parsed.errors.length === 0;

  const saveLocal = () => {
    try {
      localStorage.setItem(STORAGE_KEY, definitionText);
      setNotice('このiPhoneのブラウザに保存しました。');
    } catch (error) {
      setNotice('保存できませんでした。ブラウザの保存領域を確認してください。');
    }
  };

  const copyText = async (value, success) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(success);
    } catch (error) {
      setNotice('コピーできませんでした。ブラウザのコピー権限を確認してください。');
    }
  };

  const prompt = [
    'あなたはCANDY HOUSE SESAME Biz向けExtensionの設計アシスタントです。',
    '次の要件を読み、下記のJSONスキーマに沿った拡張定義案を作成してください。',
    '不明なAPI・イベント・コマンドを捏造せず、未確認事項は明記してください。',
    '実際の鍵の解錠・施錠などの操作コードは生成せず、必要な場合は公式API仕様の確認事項として示してください。',
    'JSONのルート項目: name(string), version(string), description(string), triggers(array), actions(array)。',
    '現時点ではこのStudioは定義の編集・検証・保存のみを行い、コードを実行しません。',
    '',
    '【ユーザー要件】',
    requirements.trim() || '（要件未入力）',
    '',
    '【現在の定義】',
    definitionText,
  ].join('\n');

  const downloadJson = () => {
    if (!valid) return;
    const blob = new Blob([JSON.stringify(parsed.value, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sesame-extension.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('JSONファイルを出力しました。');
  };

  const reset = () => {
    setDefinitionText(JSON.stringify(STARTER, null, 2));
    setNotice('初期テンプレートに戻しました。');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto', p: { xs: 1, sm: 2 } }}>
      <Stack spacing={2}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <AutoAwesomeIcon color="primary" />
            <Typography variant="h2">Extension Studio</Typography>
            <Chip size="small" color="info" label="Preview" />
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            SESAME Biz向け拡張機能の設計・編集・検証を行うワークスペース
          </Typography>
        </Box>

        <Alert severity="info">
          このバージョンは安全な設計プレビューです。コードの実行や鍵の施錠・解錠は行いません。未確認のAPIや署名方式を推測して実装することもありません。
        </Alert>

        <Card>
          <CardContent>
            <Typography variant="h3" gutterBottom>1. 作りたい機能を説明</Typography>
            <TextField
              fullWidth multiline minRows={3}
              label="拡張機能の要件"
              placeholder="例：指定した時間にデバイスの状態を確認し、条件に合えば通知する"
              value={requirements}
              onChange={(event) => { setRequirements(event.target.value); setPromptCopied(false); }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
              <Button fullWidth variant="contained" startIcon={<ContentCopyIcon />} onClick={() => copyText(prompt, 'AI向けプロンプトをコピーしました。')}>
                AI用プロンプトをコピー
              </Button>
              <Button fullWidth variant="outlined" onClick={() => setRequirements('デバイスの状態を取得し、結果を分かりやすく表示する。')}>
                サンプル要件
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="h3">2. Extension定義（JSON）</Typography>
              <Chip size="small" color={valid ? 'success' : 'error'} label={valid ? '形式チェック OK' : '要修正'} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              拡張機能の構成をJSONで編集します。これは定義データであり、実行コードではありません。
            </Typography>
            <TextField
              fullWidth multiline minRows={14} maxRows={28}
              value={definitionText}
              onChange={(event) => setDefinitionText(event.target.value)}
              inputProps={{ spellCheck: false, 'aria-label': 'Extension JSON editor' }}
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13, lineHeight: 1.55 } }}
            />
            {parsed.syntaxError && <Alert severity="error" sx={{ mt: 1 }}>JSON構文エラー：{parsed.syntaxError}</Alert>}
            {parsed.errors.length > 0 && <Alert severity="warning" sx={{ mt: 1 }}>{parsed.errors.join(' ')}</Alert>}
            {valid && <Alert severity="success" sx={{ mt: 1 }}>JSON構文と必須項目を確認しました。</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
              <Button fullWidth variant="contained" disabled={!valid} startIcon={<DownloadIcon />} onClick={downloadJson}>JSONを書き出す</Button>
              <Button fullWidth variant="outlined" onClick={saveLocal}>この端末に保存</Button>
              <Button fullWidth color="inherit" startIcon={<DeleteOutlineIcon />} onClick={reset}>初期化</Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h3" gutterBottom>3. 検証結果</Typography>
            <Stack spacing={1}>
              <Box><Typography variant="body2" color="text.secondary">JSON構文</Typography><Typography>{parsed.syntaxError ? 'エラー' : '正常'}</Typography></Box>
              <Divider />
              <Box><Typography variant="body2" color="text.secondary">トリガー数</Typography><Typography>{Array.isArray(parsed.value?.triggers) ? parsed.value.triggers.length : '確認不可'}</Typography></Box>
              <Divider />
              <Box><Typography variant="body2" color="text.secondary">アクション数</Typography><Typography>{Array.isArray(parsed.value?.actions) ? parsed.value.actions.length : '確認不可'}</Typography></Box>
              <Divider />
              <Typography variant="caption" color="text.secondary">
                検証対象はJSON構造と必須項目のみです。SESAME APIとの互換性や実機動作を保証するものではありません。
              </Typography>
            </Stack>
          </CardContent>
        </Card>
        {notice && <Alert severity="info" onClose={() => setNotice('')}>{notice}</Alert>}
      </Stack>
    </Box>
  );
}
