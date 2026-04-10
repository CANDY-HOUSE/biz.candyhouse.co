import { Box, Button, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
const levelData = () => [
  {
    id: 0,
    name: 'Free',
    feeC: 0,
    fee: '円 /月',
    isUpgrade: true,
    users: '5 ユーザー',
    doors: '1 ドア',
    apis: 'APIリクエスト上限\n 1,000 回',
    cfpUse: '認証機器・カード管理ページの利用可能',
  },
  {
    id: 1,
    name: 'Light',
    feeC: '1,980',
    fee: '円 /月',
    isUpgrade: false,
    users: '20 ユーザー',
    doors: '2 ドア',
    apis: 'APIリクエスト上限\n 30,000 回',
    cfpUse: '認証機器・カード管理ページの利用可能',
  },
  {
    id: 2,
    name: 'Pro',
    feeC: '4,980',
    fee: '円 /月',
    isUpgrade: false,
    users: '50 ユーザー',
    doors: '5 ドア',
    apis: 'APIリクエスト上限\n 100,000 回',
    cfpUse: '認証機器・カード管理ページの利用可能',
  },
  {
    id: 3,
    name: 'Business',
    feeC: '9,800',
    fee: '円 /月',
    isUpgrade: false,
    users: '100 ユーザー',
    doors: '10 ドア',
    apis: 'APIリクエスト上限\n 500,000 回',
    cfpUse: '認証機器・カード管理ページの利用可能',
  },
  {
    id: 4,
    name: 'Enterprise',
    feeC: '19,800',
    fee: '円 /月',
    isUpgrade: false,
    users: '200 ユーザー',
    doors: '50 ドア',
    apis: 'APIリクエスト上限\n 無制限',
    cfpUse: '認証機器・カード管理ページの利用可能',
  },
];

// eslint-disable-next-line
const CmCheckText = ({ item, name }) => {
  if (!item[name]) return null;

  return (
    <Box sx={{ marginBottom: '15px', display: 'flex' }}>
      <Box
        size="small"
        sx={{
          paddingTop: '6px',
          paddingRight: '4px',
          paddingLeft: '4px',
        }}
      >
        <CheckCircleIcon style={{ color: item.isUpgrade ? '#333333' : '#D3D3D3' }} />
      </Box>
      <Typography
        sx={{
          fontFamily: "'Noto Sans JP', sans-serif", // 注意字体名称的引号
          fontSize: '16px',
          fontWeight: 400,
          lineHeight: '22px',
          marginTop: '5px',
          marginLeft: '4px',
          letterSpacing: '0.06em',
          textAlign: 'left',
        }}
      >
        {item[name]}
      </Typography>
    </Box>
  );
};

export const CmFeeLevel = ({ isMobile, callUpdate, nextPrice, levleInfo }) => {
  const [data, setData] = useState(levelData());

  useEffect(() => {
    setData((prevState) =>
      prevState.map((item) => {
        let isCancel = false;
        if (nextPrice === 0) {
          isCancel = item.id === 0;
        } else {
          isCancel = nextPrice ? item.id === Math.floor(nextPrice / 2) : false;
        }
        return { ...item, isUpgrade: item.id === levleInfo.level, isCancel: isCancel };
      })
    );
  }, [levleInfo, nextPrice]);

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        marginTop: '15px',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '5px',
      }}
    >
      {data.map((item, index) => (
        <Box
          key={index}
          sx={{
            width: '100%',
            height: 'auto',
            paddingLeft: '15px',
            borderRadius: '15px',
            border: `2px solid #F1F1F1`,
            display: 'flex',
            paddingBottom: '30px',
            flexDirection: 'column',
            p: 1,
            m: 1,
          }}
        >
          <Typography
            sx={{
              fontFamily: "'Noto Sans JP', sans-serif", // 注意字体名称的引号
              fontSize: '24px',
              fontWeight: 600,
              lineHeight: '30px',
              marginTop: '15px',
              marginLeft: '6px',
              letterSpacing: '0.06em',
              textAlign: 'left',
            }}
          >
            {item.name}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'flex-end', marginTop: '20px' }}>
            <Typography
              sx={{
                fontFamily: "'Noto Sans JP', sans-serif", // 注意字体名称的引号
                fontSize: '30px',
                fontWeight: 600,
                lineHeight: '55px',
                letterSpacing: '0.06em',
                textAlign: 'left',
                marginLeft: '6px',
              }}
            >
              {item.feeC}
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Noto Sans JP', sans-serif", // 注意字体名称的引号
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: '27.24px',
                letterSpacing: '0.06em',
                textAlign: 'left',
                marginBottom: '10px',
              }}
            >
              {item.fee}
            </Typography>
          </Box>
          <Button
            disableElevation
            variant="contained"
            size="large"
            sx={{
              margin: '25px 6px',
              fontFamily: "'Noto Sans JP', sans-serif", // 注意字体名称的引号
              fontSize: item.isCancel ? '14px' : '16px',
              color: 'white',
              fontWeight: 500,
              lineHeight: '22px',
              letterSpacing: '0.06em',
              textAlign: 'left',
              '&:hover': {
                backgroundColor: '#28aeb1',
                opacity: '0.8',
              },
            }}
            disabled={item.isUpgrade}
            onClick={() => {
              console.log('clic', item);
              if (callUpdate) callUpdate(item.id, item.isCancel);
            }}
          >
            {!levleInfo
              ? 'アップグレード'
              : item.isUpgrade
                ? '現在のプラン'
                : item.id > levleInfo.level
                  ? 'アップグレード'
                  : item.isCancel
                    ? 'ダウングレード取消'
                    : 'ダウングレード'}
          </Button>
          <CmCheckText item={item} name={'users'} />
          <CmCheckText item={item} name={'doors'} />
          <CmCheckText item={item} name={'apis'} />
          <CmCheckText item={item} name={'cfpUse'} />
        </Box>
      ))}
    </Box>
  );
};
