import { Box, Button, Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, Typography } from '@mui/material';
import React, { useContext, useState } from 'react';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { LoadingButton } from '@mui/lab';
import { RoleLabel } from '@/utils/accessLabels';
import { useTranslation } from 'react-i18next';

const CheckMember = ({ btnClose, btnSure, tags }) => {
  const { t } = useTranslation();
  const { gStripe } = useContext(GlobalStateContext);
  const [tagItems, setTagItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Box>
      <Typography sx={{ paddingTop: '16px' }}>{t('bizui.checkMember.hint')}</Typography>
      <Box>
        <FormControl sx={{ display: 'center', alignItems: 'center' }}>
          <FormLabel
            sx={{
              mr: '15px',
              color: 'rgba(0, 0, 0, 0.6)',
              '&.Mui-focused': {
                color: '#28aeb1',
              },
            }}
            required
          >
            {t('bizui.common.role')}
          </FormLabel>
          <FormGroup sx={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
            {tags
              .filter((i) =>
                gStripe.customerInfo.access.includes('ユーザー')
                  ? i.tag !== 'オーナー'
                  : i.tag !== 'オーナー' && i.tag !== 'マネージャー'
              )
              .sort((a, b) => b.access.length - a.access.length)
              .map((i) => {
                return (
                  <FormControlLabel
                    key={i.tag}
                    control={
                      <Checkbox
                        sx={{
                          '&.Mui-checked': {
                            color: '#28aeb1',
                          },
                        }}
                        onChange={(e) => {
                          let index = tagItems.indexOf(e.target.value);
                          if (e.target.value === 'ゲスト') {
                            if (index === -1) {
                              setTagItems([e.target.value]);
                            } else {
                              setTagItems([]);
                            }
                          } else {
                            if (index === -1) {
                              setTagItems([...tagItems, e.target.value].filter((tag) => tag !== 'ゲスト'));
                            } else {
                              setTagItems(tagItems.filter((tag) => tag !== e.target.value));
                            }
                          }
                        }}
                        checked={tagItems.includes(i.tag)}
                      />
                    }
                    label={<RoleLabel tag={i.tag} />}
                    value={i.tag}
                  />
                );
              })}
          </FormGroup>
        </FormControl>
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mt: '10px',
        }}
      >
        <Button
          size="small"
          sx={{
            mr: '10px',
            color: '#28aeb1',
          }}
          onClick={() => {
            if (btnClose) btnClose(false);
          }}
        >
          {t('bizui.common.cancel')}
        </Button>
        <LoadingButton
          loading={isLoading}
          disableElevation
          disabled={tagItems.length < 1} // 当tagItems的长度小于等于1时禁用按钮
          variant="contained"
          size="small"
          sx={{
            color: 'white',
            backgroundColor: '#28aeb1',
            minWidth: '120px',
          }}
          onClick={() => {
            console.log('当前选择ITEMS', tagItems);
            if (btnSure) setIsLoading(true);
            btnSure(tagItems, () => {
              setIsLoading(false);
            });
          }}
        >
          {t('bizui.checkMember.addUsers')}
        </LoadingButton>
      </Box>
    </Box>
  );
};
export default CheckMember;
