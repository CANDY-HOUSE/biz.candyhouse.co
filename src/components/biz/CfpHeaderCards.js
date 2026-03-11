import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Box, IconButton, Typography, Card, CardHeader, CardContent } from '@mui/material';
import Hider from '@/components/biz/Hider';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CancelRounded from '@mui/icons-material/CancelRounded';
import CSVHandler from './device/CSVHandler';
import { Cfpupload } from './device/CfpUpload';
import { gUtils } from '@/utils/gUtils';

const CfpheaderCards = forwardRef(
  (
    {
      data,
      mdatas,
      addCard,
      goSet,
      buttonTitle,

      isBindMm = true,
      csvData,
      csvDownData,
      isShowCsv = true,
      tagTitle,
      id = 'cardID',
      csvLoading,
    },
    ref
  ) => {
    const [readCardContent, setReadCardContent] = useState(false);
    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      setReadCardContent: (content) => {
        setReadCardContent(content);
      },
    }));

    const readCardClick = () => {
      let nIschoose = !readCardContent;
      if (goSet) {
        goSet(nIschoose);
      }
    };

    return (
      <Card>
        <CardHeader
          title={
            <Box
              sx={{
                display: 'flex',
                mb: '1px',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="h2" sx={{ ml: '9px' }}>
                {data.title}
              </Typography>
              <Box sx={{ display: 'flex' }}>
                {isShowCsv && (
                  <CSVHandler
                    hint={gUtils.authText.fontCfpCards.warningMsg}
                    loading={csvLoading}
                    setData={csvData}
                    downData={csvDownData}
                  />
                )}
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Box sx={{ mt: '1px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h3" sx={{ ml: '9px' }}>
                {data.h2}
              </Typography>

              <IconButton
                onClick={readCardClick}
                size="small"
                variant="outlined"
                sx={{
                  color: '#28AEB1',
                }}
              >
                {!readCardContent ? (
                  <AddCircleIcon style={{ color: '#28AEB1' }} />
                ) : (
                  <CancelRounded style={{ color: '#28AEB1' }} />
                )}
              </IconButton>
            </Box>
            <Hider show={!readCardContent} sx={{ marginTop: '20px' }}>
              {/* 按取得按鈕前的顯示 */}
              <Box>
                <Typography variant="h4" sx={{ ml: '9px', mt: '10px', color: '#9B9B9B' }}>
                  {data.b2t}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Cfpupload
                  id={id}
                  isMobile={!isShowCsv}
                  mdatas={mdatas}
                  addCard={addCard}
                  buttonTitle={buttonTitle}
                  isBindMm={isBindMm}
                  tagTitle={tagTitle}
                />
              </Box>
            </Hider>
          </Box>
        </CardContent>
      </Card>
    );
  }
);

export default CfpheaderCards;
