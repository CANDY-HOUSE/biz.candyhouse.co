import Hider from '@/components/biz/Hider';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { Cfpupload } from './CfpUpload';

const Cfpuploaddata = ({
  readCardContent,
  cards,

  buttonTitle,
  b2t,
  addCard,
}) => {
  return (
    <Hider show={!readCardContent} sx={{ marginTop: '20px' }}>
      <Box>
        <Typography variant="h4" sx={{ ml: '9px', mt: '10px', color: '#9B9B9B' }}>
          {b2t}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Cfpupload mdatas={cards} addCard={addCard} buttonTitle={buttonTitle} />

        {/*     {cards.map((item) => (

                    <CardItem key={item.id} cards={cards}
                              item={item} setCards={setCards} callModify={callModify} buttonTitle={buttonTitle}/>
                ))}*/}
      </Box>
    </Hider>
  );
};

export default Cfpuploaddata;
