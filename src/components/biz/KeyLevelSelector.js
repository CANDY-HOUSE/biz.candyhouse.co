import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Box,
  Button,
} from '@mui/material';
import Hider from '@/components/biz/Hider';
import { LoadingButton } from '@mui/lab';
import { Grid } from '@mui/material';

const KeyLevelSelector = ({ onConfirm, onCancel, showOwnerOption = true, showButton = false }) => {
  const [level, setLevel] = useState('1'); // 默认选择管理员鍵
  const [loading, setLoading] = useState(false);
  return (
    <Box>
      <Card sx={{ mb: '10px' }}>
        <CardHeader title={<Typography variant="h2">合鍵の権限を選択</Typography>} sx={{ pb: '5px' }} />
        <CardContent>
          <FormControl sx={{ display: 'flex', alignItems: 'flex-start' }}>
            <RadioGroup
              row
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                !showButton && onConfirm(parseInt(e.target.value));
              }}
            >
              <Hider show={showOwnerOption}>
                <FormControlLabel value="0" control={<Radio />} label="オーナー鍵" />
              </Hider>
              <FormControlLabel value="1" control={<Radio />} label="マネージャー鍵" />
              <FormControlLabel value="2" control={<Radio />} label="ゲスト鍵" />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>
      {/* 按钮区域 */}
      {showButton && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button variant="text" onClick={onCancel}>
            キャンセル
          </Button>
          <Grid item xs={12}>
            <LoadingButton
              loading={loading}
              disableElevation
              size="small"
              variant="outlined"
              onClick={() => {
                setLoading(true);
                onConfirm(parseInt(level), () => {
                  setLoading(false);
                });
              }}
            >
              確認
            </LoadingButton>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default KeyLevelSelector;
