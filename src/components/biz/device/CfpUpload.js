import React, { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { CfpBindMM } from './CfpBindMember';
import { gUtils } from '@/utils/gUtils';
import { biz3utils } from '@/utils/biz3utils';

export const Cfpupload = ({
  mdatas = [],
  isBindMm = true,
  addCard,
  buttonTitle = '修正',
  tagTitle = 'カード名',
  id = 'cardID',
}) => {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    setCards(mdatas);
  }, [mdatas]);

  return (
    <>
      {cards.map((item, index) => (
        <React.Fragment key={item[id]}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              ml: '9px',
              flexDirection: 'row',
              mb: 1,
            }}
          >
            <Box sx={{ display: 'flex', width: '30%' }}>
              <Typography variant="h4" sx={{ marginRight: '20px' }}>
                {index + 1}
              </Typography>

              <Typography variant="h4">
                {id === 'cardID' ? biz3utils.formatCardID(item[id]) : gUtils.binaryToDecimal(item[id])}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'top',
                gap: 2,
                width: '40%',
              }}
            >
              <Box sx={{ width: isBindMm ? '40%' : '60%' }}>
                <TextField
                  label={tagTitle}
                  required
                  size="small"
                  variant={isBindMm ? 'outlined' : 'filled'}
                  value={item.name}
                  onChange={(e) => {
                    setCards(cards.map((card) => (card[id] === item[id] ? { ...card, name: e.target.value } : card)));
                  }}
                  sx={{ width: '100%' }}
                />
              </Box>

              {isBindMm && (
                <Box sx={{ width: '40%' }}>
                  <CfpBindMM
                    callBindMm={(value) => {
                      console.log('callBindMm', value);
                      setCards((prevCards) =>
                        prevCards.map((card) =>
                          card[id] === item[id]
                            ? {
                                ...card,
                                mm: value?.employeeName,
                                memberID: value?.subUUID,
                              }
                            : card
                        )
                      );
                    }}
                  />
                </Box>
              )}
            </Box>
            <Button
              disabled={!item.name && !item.memberID} // 当 item.n 和 item.mm 都为空时，按钮被禁用
              disableElevation
              variant="outlined"
              color="primary"
              onClick={() => {
                if (addCard) addCard(item);
                setCards((prevCards) => {
                  return prevCards.filter((card) => card[id] !== item[id]);
                });
              }}
            >
              {buttonTitle}
            </Button>
          </Box>
        </React.Fragment>
      ))}
    </>
  );
};
