import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import CfpheaderCards from '@/components/biz/CfpHeaderCards';
import DataTable from '@/components/biz/device/DataTable';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import { CfpMsg } from '@/components/biz/device/CfpMsg';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { gConfig } from '@constants/gConfig';
import { useLocation } from 'react-router-dom';
import useOperateIoT from '@hooks/useOperateIoT';
import { registerIotCallback, unregisterIotCallback } from '@hooks/useIotCallbackRegistry';
import { biz3utils } from '@/utils/biz3utils';
import useNfcCardUploader from '@/hooks/TouchProDataBufferUploader/useNfcCardUploader';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import { sesameTouchProAuthType } from '@constants/sesameTouchProAuthType';
import { gUtils } from '@/utils/gUtils';

export default function VCards() {
  const cfpheaderCardsRef = useRef(null); // 根据刷卡机报告的 录入/验证 状态， 在子组件里 更新UI，
  const floatingAddRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { state = {} } = location;
  const {
    gManageAuthData,
    gManageDevice,
    setModalTitle,
    setCustomModalOpen,
    setModalContent,
    gManageEmployee,
    gMediaType,
  } = useContext(GlobalStateContext);

  const ref = useRef(null);
  const [tableData, setTableData] = useState([]);
  const { title } = state || '';
  const [recentAddedCards, setRecentAddedCards] = useState([]);
  const { sendCmd } = useOperateIoT();

  const { uploadCardBatch, uploadState } = useNfcCardUploader(sendCmd);

  useEffect(() => {
    if (gManageDevice.filteredAccessControlDevices.length > 0) {
      gManageAuthData.fetchNfcCards();
    }
  }, [gManageDevice.filteredAccessControlDevices.length]);

  // 通过 IOT 获取所有卡片
  useEffect(() => {
    if (state.uuid) {
      setTableData(nfcCards);
    }
  }, [gManageAuthData.nfcCards]); // eslint-disable-line react-hooks/exhaustive-deps

  const nfcCards = useMemo(() => {
    return gManageAuthData.nfcCards
      .filter((item) => item.deviceID === state.uuid)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [gManageAuthData.nfcCards]);

  useEffect(() => {
    if (!gManageAuthData.nfcCardFetchState.done) {
      return;
    }
    const device = gManageDevice.filteredAccessControlDevices.find((item) => item.deviceUUID === state.uuid);
    if (!device) {
      return;
    }
    if (device.stateInfo?.cards_num !== nfcCards.length) {
      refreshCards();
    }
  }, [gManageAuthData.nfcCardFetchState.done]);

  const showError = async () => {
    setModalTitle('');
    setModalContent(
      <CfpMsg
        msg={'有効なカード名およびIDを入力してください。いずれも空欄では登録できません。'}
        onClick={() => {
          setCustomModalOpen(false);
        }}
      />
    );
    setCustomModalOpen(true);
  };

  const cardModeSetCallback = async (deviceUUID, data) => {
    console.log('cardModeSetCallback', deviceUUID, data, data.op, data.status);
    // 调用 CfpheaderCards 的 setReadCardContent 方法
    if (data.op === gConfig.cmdCode.SSM_OS3_CARD_MODE_SET && data.stpUUID === state.uuid) {
      console.log(`设备 ${deviceUUID} 卡片模式设置成功`);
      cfpheaderCardsRef.current?.setReadCardContent(data.status);
    }
  };

  registerIotCallback(gConfig.cmdCode.SSM_OS3_CARD_MODE_SET, cardModeSetCallback);

  const sendDataToSesameTouchPro = async (list) => {
    console.log('[cards][sendDataToSesameTouchPro] list:', list);
    // 输入验证
    if (!Array.isArray(list) || list.length === 0) {
      console.warn('[cards][sendDataToSesameTouchPro] Invalid input: list must be a non-empty array');
      return;
    }
    const uploadedData = await uploadCardBatch({
      deviceUUID: state.uuid,
      list,
    });
    gManageAuthData.postCards({
      deviceUUID: uploadedData.deviceUUID,
      list: uploadedData.list,
      cb: (res) => console.log('Cards saved to database', res),
    });
  };

  const processedCardOperations = new Set();
  const cardChangeCallback = async (deviceUUID, data) => {
    console.log('cardChangeCallback', deviceUUID, data);
    if (!data || typeof data !== 'object' || !data.c) {
      return;
    }
    const { cardID } = biz3utils.parseHexStrToCardInfo(data.c);
    const operationId = `${cardID}`;
    if (processedCardOperations.has(operationId)) {
      console.log(`操作 ${operationId} 已处理，跳过`);
      return;
    }
    processedCardOperations.add(operationId);
    setRecentAddedCards((prevState) => {
      if (prevState.includes(cardID)) {
        return prevState;
      } else {
        return [...prevState, cardID];
      }
    });
  };

  const recentlyAddedCards = useMemo(() => {
    if (recentAddedCards.length < 1) {
      return [];
    }
    return tableData.filter((item) => recentAddedCards.includes(item.cardID));
  }, [recentAddedCards, tableData]);

  const refreshCards = () => {
    if (wifiStateTrue) {
      gManageAuthData.clearCards(state.uuid, (_res) => {
        gManageAuthData.getAllCards(state.uuid);
      });
    }
  };

  const wifiStateTrue = useMemo(() => {
    const device = gManageDevice.filteredAccessControlDevices.find((item) => item.deviceUUID === state.uuid);
    return Boolean(device?.stateInfo?.wm2State);
  }, [state.uuid, gManageDevice.filteredAccessControlDevices]);

  const handleCarSetInputMode = async (isChoose) => {
    await sendCmd(
      biz3utils.buildPayloadModeSet({ uuid: state.uuid, type: sesameTouchProAuthType.card, insertOn: isChoose })
    );
    setRecentAddedCards([]);
    processedCardOperations.clear();
    if (isChoose) {
      registerIotCallback(gConfig.cmdCode.SSM_OS3_CARD_CHANGE, cardChangeCallback);
    } else {
      unregisterIotCallback(gConfig.cmdCode.SSM_OS3_CARD_CHANGE);
    }
  };

  const addIcCardComponent = useMemo(
    () => (
      <CfpheaderCards
        ref={cfpheaderCardsRef}
        isShowCsv={!gMediaType.isMobile}
        style={{ marginTop: '0px' }}
        csvLoading={uploadState !== 'Idle'}
        csvData={async (data) => {
          console.log('csv添加数据', data);
          setCustomModalOpen(false);
          if (gManageDevice.getWifiState(state.uuid)) {
            let list = [];
            let isCardIDExist = true;
            data.forEach((item) => {
              let data = {};
              if (item.id || item.ID || item.cardID) {
                data.cardID = item.id || item.ID || item.cardID;
                data.nameUUID = String(item.カード名 || item.name || '');
                data.cardType = item.cardType || '02';
                if (item.ユーザー) {
                  let member = gManageEmployee.employees.Items.find((it) => it.subUUID === item.ユーザー);
                  if (member) {
                    data.memberID = member.subUUID;
                  }
                }
                list.push(data);
              } else {
                isCardIDExist = false;
              }
            });
            console.log('list', list);
            console.log('isCardIDExist', isCardIDExist);
            if (isCardIDExist === true) {
              await sendDataToSesameTouchPro(list);
            } else {
              console.log('当前数据', 'erro');
              showError();
            }
          }
        }}
        data={gUtils.authText.fontCfpCards}
        goSet={async (isChoose) => {
          handleCarSetInputMode(isChoose);
        }}
        mdatas={recentlyAddedCards}
        addCard={(d) => {
          const param = {
            cardID: d.cardID,
            name: d.name,
            cardNameUUID: d.nameUUID,
            ownerSubUUID: d.memberID,
            timestamp: new Date().getTime(),
            cardType: d.cardType || '',
            stpDeviceUUID: d.deviceID,
          };
          gManageAuthData.updateCardName(param, (res) => {
            setRecentAddedCards((prevState) => prevState.filter((cardID) => cardID !== d.cardID));
            gManageAuthData.updateCardOwner(param, () => {});
            if (!res.success) {
              return;
            }
          });
        }}
      />
    ),
    [
      gMediaType.isMobile,
      uploadState,
      state.uuid,
      gUtils.authText.fontCfpCards,
      recentlyAddedCards,
      gManageEmployee.employees.Items,
    ]
  );

  return (
    <SesameFloatingAdd
      ref={floatingAddRef}
      isMobile={gMediaType.isMobile}
      popupComponent={addIcCardComponent}
      onClose={() => {
        handleCarSetInputMode(false);
      }}
    >
      <DataTable
        isMobile={gMediaType.isMobile}
        isAdd={false}
        data={tableData}
        isBind={false}
        isBack={true}
        text={title}
        columns={DataTableColumns.cardColumns({
          gManageEmployee: gManageEmployee,
          click: () => {},
          ref: ref,
          listDevices: gManageDevice.filteredAccessControlDevices,
        })}
        callAdd={() => {
          floatingAddRef.current.handleOpen();
        }}
        callRowClick={(index) => {
          navigate({
            pathname: '/biz/cards/details',
            search: createSearchParams({ did: tableData[index].cardID }).toString(),
          });
        }}
        callDelData={(items) => {
          console.log('删除数据', items);
          wifiStateTrue && gManageAuthData.sendDelCardsCmd(state.uuid, items);
        }}
        callSearch={(e) => {
          if (!e) {
            setTableData(nfcCards);
          } else {
            const reuslt = nfcCards.filter((item) => {
              const linkedmember = gManageEmployee.findEmployeeById(item.subUUID);
              const findEmployeeName = linkedmember?.employeeName?.includes(e);
              const findId = biz3utils.formatCardID(item.cardID).includes(e.toLowerCase());
              const findSimpleID = item.cardID.toLowerCase().includes(e.toLowerCase());
              const findCardName = item.name?.includes(e);
              return findCardName || findEmployeeName || findId || findSimpleID;
            });
            setTableData(reuslt);
          }
        }}
        callRefresh={
          wifiStateTrue
            ? (_e) => {
                refreshCards();
              }
            : null
        }
      />
    </SesameFloatingAdd>
  );
}
