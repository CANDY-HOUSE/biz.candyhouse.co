import React, { useContext, useState } from 'react';
import { Typography, ListItemButton, ListItemIcon, ListItemText, CircularProgress } from '@mui/material';
import { Box } from '@mui/system';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CreditCard from '@mui/icons-material/CreditCard';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import Hider from '@/components/biz/Hider';

export default function CreditCardList() {
  const { gStripe } = useContext(GlobalStateContext);
  const [loadingId, setLoadingId] = useState('');

  return (
    <Box>
      {/* <List disablePadding> */}
      {/* {JSON.stringify(gStripe.subscription.id)} */}
      {gStripe.cardList.length > 0 &&
        gStripe.cardList.map((row, _index) => (
          <ListItemButton
            disableRipple
            key={row.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              borderBottom: '1px solid #F1F1F1',
            }}
            onClick={(event) => {
              event.preventDefault();
              if (!row.isDefaultPay) {
                setLoadingId(row.id);
                gStripe.changeDefaultPay(row.id, (_res) => {
                  setLoadingId('');
                });
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CreditCard sx={{ color: 'gray', marginRight: '5px' }} />
              <ListItemText>
                {row.brand} - {row.last4}
              </ListItemText>
              <Hider show={row.isDefaultPay}>
                <ListItemText
                  disableTypography
                  primary={
                    <Typography
                      style={{
                        color: '#FFFFFF',
                        backgroundColor: '#68C6C8',
                        fontSize: '10px',
                        borderRadius: '3px',
                        padding: '2px',
                        marginLeft: '5px',
                        marginRight: '5px',
                      }}
                    >
                      デフォルト
                    </Typography>
                  }
                />
              </Hider>
              {loadingId === row.id && <CircularProgress size={18} sx={{ marginLeft: '10px' }} />}
            </Box>
            <Hider show={gStripe.cardList.length > 1}>
              <ListItemIcon
                onClick={(event) => {
                  event.stopPropagation();
                  gStripe.delCard(row.id);
                }}
              >
                <DeleteOutlineIcon
                  sx={{
                    color: '#E1E1E1',
                    opacity: gStripe.cardList ? '1' : '.5',
                    '&:hover': {
                      color: '#CC4A44',
                      opacity: 1,
                    },
                  }}
                />
              </ListItemIcon>
            </Hider>
          </ListItemButton>
        ))}
      {/* </List> */}
    </Box>
  );
}
