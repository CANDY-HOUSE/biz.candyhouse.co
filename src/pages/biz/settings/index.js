import React, { useState, useContext, useEffect, useMemo } from 'react';
import { Box, Card, CardContent, CardHeader, IconButton, Typography } from '@mui/material';
import { CmPay } from '@/components/biz/payment/CmPay';
import CreditCardList from '@/components/biz/payment/CreditCardList';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { CmFeeLevel } from '@/components/biz/payment/CmFeeLevel';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { CmLevelUpdate } from '@/components/biz/payment/CmLevelUpdate';
import { gUtils } from '@/utils/gUtils';
import EditableText from '@/components/EditableText';

const leftItemStyle = {
  fontFamily: "'Noto Sans JP', sans-serif",
  fontSize: '16px',
  fontWeight: 600,
  width: '400px',
  lineHeight: '22px',
  letterSpacing: '0.06em',
  textAlign: 'left',
  color: '#333333',
};

const rightItemStyle = {
  fontFamily: "'Noto Sans JP', sans-serif",
  fontSize: '16px',
  marginLeft: '20px',
  fontWeight: 400, // Normal weight
  lineHeight: '22px',
  letterSpacing: '0.06em',
  textAlign: 'left',
  color: '#333333',
  whiteSpace: 'pre',
};

const CmTextItem = ({ leftItem, rightItem }) => {
  const [rightText, setRightText] = useState('');
  useEffect(() => {
    setRightText(rightItem);
  }, [rightItem]);
  return (
    <>
      <Box sx={{ display: 'flex', mt: '20px' }}>
        <Typography variant="h3" sx={{ ...leftItemStyle }}>
          {leftItem}
        </Typography>

        {rightText && (
          <Typography variant="h3" sx={{ ...rightItemStyle }}>
            {rightText}
          </Typography>
        )}
      </Box>
    </>
  );
};

export default function Settings() {
  const { gStripe, setCustomModalOpen, setModalContent, setCustomModalKeep, setSnackbarValue, gMediaType } =
    useContext(GlobalStateContext);
  const [paymentConfig, setPaymentConfig] = useState({
    config: {},
    isYear: false,
    time: 0,
    total: 0,
    level: 0,
  });
  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('ja-JP').format(paymentConfig.total);
  }, [paymentConfig.total]);

  const formattedDate = useMemo(() => {
    return gUtils.timeToDate(paymentConfig.time);
  }, [paymentConfig.time]);

  const isShowPaymentPlan = useMemo(() => {
    // 超级公司无服务费计划入口和下次支付日期
    if (gStripe.priorityCompany.isRootUser) {
      return false;
    }
    // 其他公司 不是 owner 不用显示
    if (gStripe.isOwner) {
      return true;
    }
    return false;
  }, [gStripe.priorityCompany, gStripe.isOwner]);

  useEffect(() => {
    // 显示控件时，才需要获取卡片
    if (isShowPaymentPlan) {
      gStripe.getCardList();
      gStripe.getLevelConfig((res) => {
        if (res.success) {
          setPaymentConfig({ ...res.data });
        }
      });
    }
  }, [gStripe.priorityCompany.companyID, isShowPaymentPlan]);

  const openCmPay = () => {
    setCustomModalOpen(true);
    setModalContent(
      <CmPay
        gStripe={gStripe}
        submit={() => {
          setCustomModalOpen(false);
        }}
      />
    );
  };

  const callUpdate = async (chooseLevel, isCancel) => {
    if (isCancel) {
      gStripe.updateLevel({ level: 0, isUpgrade: false, isCancel: true });
    } else {
      if (gStripe.cardList.length > 0) {
        setCustomModalOpen(true);
        setCustomModalKeep(true);
        setModalContent(
          <CmLevelUpdate
            levelConfig={paymentConfig.config}
            clickCancel={() => {
              setCustomModalKeep(false);
              setCustomModalOpen(false);
            }}
            clickSure={(nlevel, isYear, callback) => {
              //  if (isYear)
              let c = isYear ? 1 : 0;
              let plevel = Math.floor(nlevel * 2 + c);
              let isUpgrade = paymentConfig.level * 2 < plevel;
              console.log('levelInfo', plevel, nlevel, isYear, paymentConfig.level, isUpgrade);
              gStripe.updateLevel({
                level: plevel,
                isUpgrade,
                cb: (_res) => {
                  setCustomModalKeep(false);
                  setCustomModalOpen(false);
                  callback && callback();
                  if (!_res.success) {
                    setSnackbarValue({
                      open: true,
                      msg: _res.message,
                    });
                  }
                },
              });
            }}
            chooseLevel={chooseLevel}
            curLevel={paymentConfig.level}
          />
        );
      } else {
        console.log('openCmPay');
        openCmPay();
      }
    }
  };

  const getLevel = (level) => {
    const levelName = ['Free', 'Light', 'Pro', 'Business', 'Enterprise'];
    return levelName[level];
  };

  const getNextLevelTitle = (gStripe) => {
    if (gStripe.priorityCompany.isRootUser) {
      return '無制限プラン';
    }
    let info = paymentConfig;
    const paymentMethod = info.isYear ? '年額プラン' : '月額プラン';
    if (info.nextEndDate) {
      console.log('info.nextPrice', info.nextPrice);
      let date = new Date(parseInt(info.nextEndDate) * 1000);
      let time = date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
      let myear = info.nextPrice % 2 === 1 ? '年額プラン' : '月額プラン';
      return `${getLevel(info.level)} (${paymentMethod})        ※${time} ${getLevel(Math.floor(info.nextPrice / 2))}(${myear})にダウングレードします。`;
    } else {
      return `${getLevel(info.level || 0)} (${paymentMethod})`;
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Typography variant="h2" sx={{ ml: '9px' }}>
              設定
            </Typography>
          }
        />
        <CardContent
          sx={{
            mt: 0,
            p: '0px',
          }}
        >
          <Card>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                lineHeight: leftItemStyle.lineHeight,
                height: '22px',
              }}
            >
              <Typography sx={{ ...leftItemStyle }}>会社名</Typography>
              <Box sx={{ ml: '12px' }}>
                <EditableText
                  style={{ ...rightItemStyle, marginLeft: '0' }}
                  initialValue={gStripe.priorityCompany.name}
                  onSave={
                    gStripe.isOwner &&
                    ((newValue, callback) => {
                      if (!newValue || !callback) {
                        return;
                      }
                      gStripe.updateCompanyName(newValue, (res) => {
                        callback(res.success);
                        if (res.success && !gStripe.customerInfo.isSesameApp) {
                          gStripe.setCustomerInfo((prev) => {
                            return {
                              ...prev,
                              name: newValue,
                            };
                          });
                        }
                      });
                    })
                  }
                />
              </Box>
            </Box>
            <CmTextItem leftItem={'現在ご契約中のプラン'} rightItem={getNextLevelTitle(gStripe)} />
            {!gStripe.priorityCompany.isRootUser && (
              <>
                <CmTextItem leftItem={'次のお支払い日'} rightItem={formattedDate} />
                <CmTextItem leftItem={'次のお支払い金額'} rightItem={`${formattedPrice}円(税込)`} />
              </>
            )}
            {isShowPaymentPlan && (
              <Box>
                <Box sx={{ display: 'flex', marginTop: '36px' }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontFamily: "'Noto Sans JP', sans-serif",
                      fontSize: '20px',
                      fontWeight: 600,
                      marginTop: '5px',
                      lineHeight: '27px',
                      letterSpacing: '0.06em',
                      textAlign: 'left',
                      color: '#333333',
                    }}
                  >
                    {'お支払い情報'}
                  </Typography>
                  <IconButton sx={{ ml: '10px' }} onClick={openCmPay}>
                    <AddCircleIcon style={{ color: '#28AEB1' }} />
                  </IconButton>
                </Box>
                <CreditCardList />
                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: "'Noto Sans JP', sans-serif",
                    fontSize: '20px',
                    fontWeight: 600,
                    marginTop: '36px',
                    lineHeight: '27px',
                    letterSpacing: '0.06em',
                    textAlign: 'left',
                    color: '#333333',
                  }}
                >
                  {'プラン'}
                </Typography>
                <CmFeeLevel
                  isMobile={gMediaType.isMobile}
                  callUpdate={callUpdate}
                  nextPrice={paymentConfig.nextPrice}
                  levleInfo={paymentConfig}
                />
                <Typography sx={{ marginLeft: '8px' }}>
                  ※プランの表示価格はすべて年額プランの月換算した金額（税抜き）です。
                </Typography>
              </Box>
            )}
          </Card>
        </CardContent>
      </Card>
    </>
  );
}
