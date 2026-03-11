import { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Box, Card, CardHeader, IconButton, Typography } from '@mui/material';
import { CfpDgBindMember } from '@/components/biz/device/CfpDialogBindMember';
import CheckTable from '@/components/biz/CheckTable';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gConfig } from '@constants/gConfig';
import { wordConfig } from '@constants/wordConfig';
import { useTranslation } from 'react-i18next';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { biz3utils } from '@/utils/biz3utils';
import useOperateIoT from '@hooks/useOperateIoT';
import { Buffer } from 'buffer';
import CardInfoDisplay from '@/components/biz/device/CardDeviceInfo';
import { registerIotCallback, unregisterIotCallback } from '@hooks/useIotCallbackRegistry';

export default function CardDetails() {
  const [searchParams] = useSearchParams();
  const did = searchParams.get('did') || '';
  const { t } = useTranslation(); // i18n
  const {
    gManageAuthData,
    gManageDevice,
    setCustomModalOpen,
    gManageEmployee,
    setModalContent,
    setSnackbarValue,
    gMediaType,
  } = useContext(GlobalStateContext);
  const navigate = useNavigate();
  const [isBindMember, setIsBindMember] = useState(false);
  const pendingDevicesRef = useRef({ deviceIDs: [], cb: null });
  const { sendCmd } = useOperateIoT();

  const cards = useMemo(() => {
    return gManageAuthData
      .findCardsByCardID(did.toUpperCase().replace(/-/g, ''))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [gManageAuthData.nfcCards, did]);

  const cardDetail = useMemo(() => {
    return {
      [wordConfig.touchDeviceName]: gManageEmployee.findEmployeeById(cards[0]?.subUUID).employeeName ?? '-',
      [wordConfig.touchCertEquipment]: cards.map((it) => {
        return {
          title: gManageDevice.findTouchName(it.deviceID),
          value: it.name,
          rawData: it,
        };
      }),
    };
  }, [cards]);

  const defaultCardInfo = useMemo(() => {
    if (cards.length < 1) {
      return {};
    }
    return gManageEmployee.employees.Items.find((item) => item.subUUID === cards[0].subUUID);
  }, [gManageEmployee.employees, cards]);

  useEffect(() => {
    registerIotCallback(gConfig.cmdCode.SSM_OS3_CARD_CHANGE, async (deviceUUID, data) => {
      // 加卡后，给默认名称
      if (!data) {
        return;
      }
      const cardItem = biz3utils.parseHexStrToCardInfo(data.c);
      if (!cardItem || cards.length < 1) {
        return;
      }
      const idx = pendingDevicesRef.current.deviceIDs.indexOf(deviceUUID);
      if (idx > -1) {
        pendingDevicesRef.current.deviceIDs.splice(idx, 1);
      }
      if (pendingDevicesRef.current.deviceIDs.length === 0) {
        pendingDevicesRef.current.cb && pendingDevicesRef.current.cb(true);
        setCustomModalOpen(false);
      }
      const param = {
        cardID: cardItem.cardID,
        name: cards[0].name || '',
        cardNameUUID: cardItem.nameUUID || '',
        timestamp: new Date().getTime(),
        cardType: cardItem.cardType || '',
        stpDeviceUUID: deviceUUID,
      };
      gManageAuthData.updateCardName(param, () => {});
    });
    return () => {
      unregisterIotCallback(gConfig.cmdCode.SSM_OS3_CARD_CHANGE);
    };
  }, []);

  const handleOpenModal = () => {
    let value = gManageDevice.filteredAccessControlDevices.filter(
      (item) => !cards[0].uuids.some((it) => it === item.deviceUUID)
    );
    setModalContent(
      <CheckTable
        loadingAble
        title={t('pages.sesameAccessControlDevice.index.SelectAuthenticationDevice')}
        setOpenModal={setCustomModalOpen}
        selectableRows={'multiple'}
        handleClose={() => {
          setCustomModalOpen(false);
        }}
        data={value}
        handleCheck={handleCheck}
        isWifi={true}
      />
    );
    setCustomModalOpen(true);
  };

  const handleCheck = async (items, cb) => {
    console.log('items', items);
    pendingDevicesRef.current = {
      deviceIDs: items.map((it) => it.deviceUUID),
      cb: cb,
    };
    // 计算 卡片 uuid 的长度
    const cardID = cards[0].cardID;
    const payload = biz3utils.buildPayloadCardAdd({ cardID });
    for (const item of items) {
      let cmd = {
        topic: `stp${item.deviceUUID}cmd`,
        payload: Buffer.from(payload).toString('base64'),
        op: gConfig.cmdCode.SSM_OS3_CARD_ADD,
      };
      await sendCmd(cmd);
      if (items.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  };

  const sendCardDeleteToSesameTouchPro = async (card) => {
    let cardID = biz3utils.hexStringToUint8Array(card.cardID);
    let payloadSize = 1 + cardID.length;
    let payloadU8A = new Uint8Array(payloadSize);
    payloadU8A[0] = gConfig.cmdCode.SSM_OS3_CARD_DELETE;
    payloadU8A.set(cardID, 1);
    let payload = Buffer.from(payloadU8A).toString('base64');
    let cmd = {
      topic: `stp${card.deviceID}cmd`,
      payload,
      op: gConfig.cmdCode.SSM_OS3_CARD_DELETE,
    };
    await sendCmd(cmd);
  };

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => navigate(-1)}>
                <KeyboardArrowLeftIcon sx={{ ml: -2 }} />
              </IconButton>
              <Typography variant="h3">{biz3utils.formatCardID(cards[0]?.cardID)}</Typography>
            </Box>
          }
        />
        <CardInfoDisplay
          isMobile={gMediaType.isMobile}
          data={cardDetail}
          onEdit={(label, newValue, index, callback) => {
            if (label === wordConfig.touchDeviceName) {
              setIsBindMember(true);
            } else if (label === wordConfig.touchCertEquipment) {
              const cardItem = cards[index] || {};
              if (newValue === cardItem?.name) {
                callback(true);
                return;
              }
              const param = {
                cardID: cardItem.cardID,
                name: newValue,
                cardNameUUID: cardItem.nameUUID || '',
                timestamp: new Date().getTime(),
                cardType: cardItem.cardType || '',
                stpDeviceUUID: cardItem.deviceID,
              };
              gManageAuthData.updateCardName(param, (resp) => {
                if (resp.errMsg) {
                  setSnackbarValue({
                    open: true,
                    msg: resp.errMsg,
                  });
                  callback(false);
                } else {
                  callback(true);
                }
              });
            }
          }}
          onDelete={(label, index) => {
            sendCardDeleteToSesameTouchPro(cards[index]);
          }}
          onAdd={handleOpenModal}
        />
      </Card>
      <CfpDgBindMember
        defaultVal={defaultCardInfo}
        mOpen={isBindMember}
        handleClose={() => setIsBindMember(false)}
        handleSure={(arg, cb) => {
          const param = {
            cardID: cards[0].cardID,
            ownerSubUUID: arg?.subUUID || '',
          };
          gManageAuthData.updateCardOwner(param, (_res) => {
            setIsBindMember(false);
            cb(true);
          });
        }}
      />
    </>
  );
}
