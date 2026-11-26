import React, { useState, useContext, useEffect, useMemo } from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { CmPay } from '@/components/biz/payment/CmPay';
import CreditCardList from '@/components/biz/payment/CreditCardList';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { CmFeeLevel } from '@/components/biz/payment/CmFeeLevel';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { CmLevelUpdate } from '@/components/biz/payment/CmLevelUpdate';
import { gUtils } from '@/utils/gUtils';
import EditableText from '@/components/EditableText';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LanguageMenu from '@/components/LanguageMenu';
import { followsSystemLanguage } from '@/i18n';
import { PcPage, PcRow, PcSection } from '@/components/PcGrouped';
import { logOperationFailure } from '@/services/operationFailure';
import { ios } from '@/theme/appHomeStyle';

const DeleteConfirm = ({ t, onCancel, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  return (
    <Box>
      <Typography sx={{ mt: '8px', lineHeight: 1.6 }}>{t('setting.deleteOrgConfirm')}</Typography>
      {error && <Typography sx={{ mt: '8px', lineHeight: 1.6, color: 'error.main' }}>{error}</Typography>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: '16px' }}>
        <Button size="small" disabled={isLoading} onClick={onCancel}>
          {t('setting.cancel')}
        </Button>
        <LoadingButton
          size="small"
          color="error"
          variant="contained"
          disableElevation
          loading={isLoading}
          sx={{ ml: '8px' }}
          onClick={() => {
            setIsLoading(true);
            setError('');
            onConfirm((message) => {
              setIsLoading(false);
              setError(message || '');
            });
          }}
        >
          {t('setting.delete')}
        </LoadingButton>
      </Box>
    </Box>
  );
};

export default function Settings() {
  const { gStripe, setCustomModalOpen, setModalContent, setCustomModalKeep, setSnackbarValue } =
    useContext(GlobalStateContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const confirmDelete = () => {
    setCustomModalOpen(true);
    setModalContent(
      <DeleteConfirm
        t={t}
        onCancel={() => {
          setCustomModalOpen(false);
        }}
        onConfirm={(done) => {
          gStripe.deleteCompany((res) => {
            if (!res.success) {
              logOperationFailure('pages/biz/settings/index.confirmDelete');
              // Error toasts are log-only, so the reason the server refused is shown inside the dialog.
              done(
                t(
                  res.code === 400
                    ? 'setting.deleteOrgDowngrade'
                    : res.code === 403 && res.message !== 'Forbidden'
                      ? 'setting.deleteOrgLast'
                      : 'setting.deleteOrgFailed'
                )
              );
              return;
            }
            done();
            setCustomModalOpen(false);
            navigate('/');
          });
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
                      logScope: 'pages/biz/settings/index.callUpdate',
                      severity: 'error',
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
      return t('admin.settings.unlimitedPlan');
    }
    let info = paymentConfig;
    const paymentMethod = info.isYear ? t('admin.plan.yearly') : t('admin.plan.monthly');
    if (info.nextEndDate) {
      console.log('info.nextPrice', info.nextPrice);
      let date = new Date(parseInt(info.nextEndDate) * 1000);
      let time = t('admin.settings.date', {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
      });
      let myear = info.nextPrice % 2 === 1 ? t('admin.plan.yearly') : t('admin.plan.monthly');
      return `${getLevel(info.level)} (${paymentMethod})        ${t('admin.settings.downgradeNotice', { date: time, level: getLevel(Math.floor(info.nextPrice / 2)), method: myear })}`;
    } else {
      return `${getLevel(info.level || 0)} (${paymentMethod})`;
    }
  };

  return (
    <PcPage title={t('navigator.Settings')}>
      <PcSection>
        <PcRow label={t('admin.settings.company')}>
          <EditableText
            style={{ fontSize: '16px', color: ios.secondaryLabel }}
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
          {gStripe.isOwner && (
            <IconButton color="error" size="small" sx={{ mr: '-6px' }} onClick={confirmDelete}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </PcRow>
        <PcRow
          label={t('admin.settings.currentPlan')}
          value={getNextLevelTitle(gStripe)}
          sx={{ whiteSpace: 'pre-wrap' }}
        />
        {!gStripe.priorityCompany.isRootUser && (
          <>
            <PcRow label={t('admin.settings.nextPaymentDate')} value={formattedDate} />
            <PcRow
              label={t('admin.settings.nextPaymentAmount')}
              value={t('admin.settings.priceWithTax', { price: formattedPrice })}
            />
          </>
        )}
      </PcSection>
      {!followsSystemLanguage && (
        <PcSection>
          <PcRow label={t('language.title')}>
            <Box sx={{ mr: '-12px' }}>
              <LanguageMenu />
            </Box>
          </PcRow>
        </PcSection>
      )}
      {isShowPaymentPlan && (
        <>
          <PcSection
            title={t('admin.settings.paymentInfo')}
            action={
              <IconButton size="small" aria-label={t('admin.settings.paymentInfo')} onClick={openCmPay}>
                <AddCircleIcon sx={{ color: ios.tint }} />
              </IconButton>
            }
          >
            {gStripe.cardList.length > 0 ? (
              <CreditCardList />
            ) : (
              <PcRow
                value={<Typography sx={{ color: ios.tint }}>{t('admin.payment.addMethod')}</Typography>}
                onClick={openCmPay}
              />
            )}
          </PcSection>
          <PcSection
            title={t('admin.settings.plan')}
            footer={t('admin.settings.priceNote')}
            cardSx={{ bgcolor: 'transparent', borderRadius: 0, overflow: 'visible' }}
          >
            <CmFeeLevel callUpdate={callUpdate} nextPrice={paymentConfig.nextPrice} levleInfo={paymentConfig} />
          </PcSection>
        </>
      )}
    </PcPage>
  );
}
