import { Box, Button, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
const levelData = () => [
  {
    id: 0,
    name: 'Free',
    feeC: 0,
    fee: '円 /月',
    isCheck: false,
    upgrade: 'アップグレード',
    isUpgrade: true,
    users: '5 ユーザー',
    doors: '1 ドア',
    cards: '5 カード',
    fingers: '5 指紋',
    passwords: '5 暗証番号',
    apis: 'APIリクエスト上限\n 3,000 回',
    cfpUse: '認証機器・カード管理ページの利用可能',
  },
  {
    id: 1,
    name: 'Light',
    feeC: '1,980',
    fee: '円 /月',
    isCheck: false,
    upgrade: 'アップグレード',
    isUpgrade: false,
    users: '20 ユーザー',
    doors: '2 ドア',
    cards: '20 カード',
    fingers: '15 指紋',
    passwords: '10 暗証番号',
    apis: 'APIリクエスト上限\n 30,000 回',
    cfpUse: '認証機器・カード管理ページの利用可能',
  },
  {
    id: 2,
    name: 'Pro',
    feeC: '4,980',
    fee: '円 /月',
    isCheck: false,
    upgrade: 'アップグレード',
    isUpgrade: false,
    users: '50 ユーザー',
    doors: '5 ドア',
    cards: '50 カード',
    fingers: '25 指紋',
    passwords: '50 暗証番号',
    apis: 'APIリクエスト上限\n 100,000 回',
    cfpUse: '認証機器・カード管理ページの利用可能',
  },
  {
    id: 3,
    name: 'Business',
    feeC: '9,800',
    fee: '円 /月',
    isCheck: false,
    upgrade: 'アップグレード',
    isUpgrade: false,
    users: '100 ユーザー',
    doors: '10 ドア',
    cards: '100 カード',
    fingers: '50 指紋',
    passwords: '100 暗証番号',
    apis: 'APIリクエスト上限\n 500,000 回',
    cfpUse: '認証機器・カード管理ページの利用可能',
  },
  {
    id: 4,
    name: 'Enterprise',
    feeC: '19,800',
    fee: '円 /月',
    isCheck: false,
    upgrade: 'アップグレード',
    isUpgrade: false,
    users: '200 ユーザー',
    doors: '50 ドア',
    cards: '200 カード',
    fingers: '100 指紋',
    passwords: '200 暗証番号',
    apis: 'APIリクエスト上限\n 無制限',
    cfpUse: '認証機器・カード管理ページの利用可能',
  },
];

// eslint-disable-next-line
const CmCheckText = ({ item, name, onCheckChange }) => {
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
        // onClick={() => {
        //  onCheckChange({...item,isCheck:!item.isCheck});
        // }}
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

        // console.log("isCancelisCancel",isCancel,nextPrice,level,item.id)
        return { ...item, isUpgrade: item.id === levleInfo.level, isCancel: isCancel };
      })
    );
  }, [levleInfo, nextPrice]);

  const handleCheckChange = (newItem) => {
    setData(data.map((item) => (item.id === newItem.id ? newItem : item)));
  };

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

          {/*   {item.isUpgrade
                        ?<Button variant="contained" sx={{marginTop:'20px'}}>{item.upgrade}</Button>
                        :<Button variant="outlined">{item.upgrade}</Button>}*/}

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
            /*    disabled={
              item.isUpgrade || (gStripe.levelInfo && item.id < gStripe.levelInfo.nextPrice)
            }*/
            disabled={item.isUpgrade}
            onClick={() => {
              console.log('clic', item);
              if (callUpdate) callUpdate(item.id, item.isCancel);
            }}
          >
            {item.isUpgrade
              ? '現在のプラン'
              : item.id > levleInfo.level
                ? 'アップグレード'
                : item.isCancel
                  ? 'ダウングレード取消'
                  : 'ダウングレード'}
          </Button>
          <CmCheckText item={item} onCheckChange={handleCheckChange} name={'users'} />
          <CmCheckText item={item} onCheckChange={handleCheckChange} name={'doors'} />
          {/*         <CmCheckText
            item={item}
            onCheckChange={handleCheckChange}
            name={"cards"}
          />
          <CmCheckText
            item={item}
            onCheckChange={handleCheckChange}
            name={"fingers"}
          />
          <CmCheckText
            item={item}
            onCheckChange={handleCheckChange}
            name={"passwords"}
          />*/}
          <CmCheckText item={item} onCheckChange={handleCheckChange} name={'apis'} />
          <CmCheckText item={item} onCheckChange={handleCheckChange} name={'cfpUse'} />
        </Box>
      ))}
    </Box>
  );
};
