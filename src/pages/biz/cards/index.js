import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { Collapse } from '@mui/material';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import CheckTable from '@/components/biz/CheckTable';
import AddIcCard from '@/components/biz/device/AddIcCard';
import DataTable from '@/components/biz/device/DataTable';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import { biz3utils } from '@/utils/biz3utils';
import { gConfig } from '@constants/gConfig';
import { useTranslation } from 'react-i18next';
import { createSearchParams, useNavigate } from 'react-router-dom';
import useOperateIoT from '@hooks/useOperateIoT';
import { Buffer } from 'buffer';
import { registerIotCallback, unregisterIotCallback } from '@hooks/useIotCallbackRegistry';
import useNfcCardUploader from '@/hooks/TouchProDataBufferUploader/useNfcCardUploader';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import { sesameTouchProAuthType } from '@constants/sesameTouchProAuthType';

export default function Cards({ location }) {
  const addIcCardRef = useRef(null); // 创建 ref
  const floatingAddRef = useRef(null);
  const { t } = useTranslation(); // i18n
  const { gManageDevice, gManageAuthData, setCustomModalOpen, setModalContent, gManageEmployee, gMediaType } =
    useContext(GlobalStateContext);
  const navigate = useNavigate();
  const [chooseOpen, setChooseOpen] = useState(false);
  const [touchList, setTouchList] = useState([]);
  const [tbData, setTbData] = useState([]);
  const [refreshTb, setRefreshTb] = useState(0x111);
  const [tbSelect, setTbSelect] = useState([]);
  const ref = useRef(null);
  const [recentAddedCards, setRecentAddedCards] = useState([]);
  const { sendCmd } = useOperateIoT();
  const { uploadCardBatch, uploadState } = useNfcCardUploader(sendCmd);

  let cardQueue = [];
  let isProcessing = false;

  const cardModeSetCallback = async (deviceUUID, data) => {
    console.log('cardModeSetCallback', deviceUUID, data, data.op, data.status);
    // 调用 AddIcCard 的 setReadCardContent 方法
    if (data.op === gConfig.cmdCode.SSM_OS3_CARD_MODE_SET) {
      console.log(`设备 ${deviceUUID} 卡片模式设置成功`);
      addIcCardRef.current?.setReadCardContent(data.status);
    }
  };
  registerIotCallback(gConfig.cmdCode.SSM_OS3_CARD_MODE_SET, cardModeSetCallback);
  const handleCheck = async (devices, cb) => {
    registerIotCallback(gConfig.cmdCode.SSM_OS3_CARD_CHANGE, batchLinkCardCallback);
    cardQueue = [];
    tbSelect.forEach((card) => {
      devices.forEach((device) => {
        cardQueue.push({
          cardID: card.cardID,
          deviceUUID: device.deviceUUID,
          name: card.name,
          processed: false,
        });
      });
    });
    processQueue(cb);
    console.log(`队列已创建，共 ${cardQueue.length} 个任务`);
  };

  // 处理队列中的下一项
  const processQueue = async (cb) => {
    // 如果已经在处理或队列为空，则返回
    if (isProcessing || cardQueue.length === 0) {
      return;
    }
    const index = cardQueue.findIndex((item) => !item.processed);
    if (index === -1) {
      console.log('所有卡片处理完成');
      setTbSelect([]);
      cardQueue = [];
      unregisterIotCallback(gConfig.cmdCode.SSM_OS3_CARD_CHANGE);
      cb && cb();
      setCustomModalOpen(false);
      setRefreshTb((prev) => prev + 1);
      return;
    }
    // 标记为处理中
    isProcessing = true;
    const item = cardQueue[index];
    item.processed = true;
    console.log(`处理: 设备 ${item.deviceUUID} 的卡片 ${item.cardID}`);
    // 准备发送数据
    const payload = biz3utils.buildPayloadCardAdd({ cardID: item.cardID });
    let cmd = {
      topic: `stp${item.deviceUUID}cmd`,
      payload: Buffer.from(payload).toString('base64'),
      op: gConfig.cmdCode.SSM_OS3_CARD_ADD,
    };
    await sendCmd(cmd);
  };

  // 卡片添加回调
  const batchLinkCardCallback = (deviceUUID, data) => {
    // 如果没有正在处理，忽略回调
    if (!isProcessing) return;
    try {
      // 解析卡片ID
      const cardInfo = biz3utils.parseHexStrToCardInfo(data.c);
      const cardID = cardInfo.cardID;
      // 获取当前正在处理的项
      const currentItem = cardQueue.find(
        (item) => item.processed && !item.completed && item.cardID === cardID && item.deviceUUID === deviceUUID
      );
      if (currentItem) {
        const param = {
          cardID: cardInfo.cardID,
          name: currentItem.name || '',
          cardNameUUID: cardInfo.nameUUID || '',
          timestamp: new Date().getTime(),
          cardType: cardInfo.cardType || '',
          stpDeviceUUID: deviceUUID,
        };
        gManageAuthData.updateCardName(param, () => {});
        console.log(`成功添加卡片: ${cardID} 到设备: ${deviceUUID}`);
        // 标记为已完成
        currentItem.completed = true;
        // 重置处理状态
        isProcessing = false;
        // 延迟处理下一项，给设备一些恢复时间
        setTimeout(processQueue, 200);
      }
    } catch (error) {
      console.error('解析回调数据失败:', error);
    }
  };

  useEffect(() => {
    if (!gManageAuthData || !Array.isArray(gManageAuthData.nfcCards) || gManageAuthData.nfcCards.length === 0) {
      setTbData([]);
      return;
    }
    setTbData(uniqueCards);
  }, [gManageAuthData.nfcCards]);

  const uniqueCards = useMemo(() => {
    const uniqueCardsMap = new Map();
    gManageAuthData.nfcCards.forEach((item) => {
      const existingCard = uniqueCardsMap.get(item.cardID);
      if (!existingCard) {
        uniqueCardsMap.set(item.cardID, item);
      } else {
        if (item.timestamp < existingCard.timestamp) {
          uniqueCardsMap.set(item.cardID, item);
        }
      }
    });
    return Array.from(uniqueCardsMap.values());
  }, [gManageAuthData.nfcCards]);

  const handleOpenModalCsv = (call) => {
    setModalContent(
      <CheckTable
        title={t('pages.sesameAccessControlDevice.index.SelectAuthenticationDevice')}
        selectableRows={'multiple'}
        setOpenModal={setCustomModalOpen}
        handleClose={() => {
          setCustomModalOpen(false);
        }}
        data={canChoosedAcDevices}
        handleCheck={(devices) => {
          setCustomModalOpen(false);
          if (call) call(devices);
        }}
        location={location}
        isWifi={true}
      />
    );
    setCustomModalOpen(true);
  };

  const handleOpenModalChoose = (call) => {
    setModalContent(
      <CheckTable
        loadingAble
        title={t('pages.sesameAccessControlDevice.index.SelectAuthenticationDevice')}
        selectableRows={'multiple'}
        setOpenModal={setCustomModalOpen}
        handleClose={() => {
          setCustomModalOpen(false);
        }}
        data={canChoosedAcDevices}
        handleCheck={(devices, cb) => {
          call && call(devices, cb);
        }}
        location={location}
        isWifi={true}
      />
    );
    setCustomModalOpen(true);
  };

  const canChoosedAcDevices = useMemo(() => {
    return gManageDevice.filteredAccessControlDevices.filter((item) => item.stateInfo?.wifiState !== false);
  }, [gManageDevice.filteredAccessControlDevices]);

  const bindOpenModalChoose = (_items) => {
    setModalContent(
      <CheckTable
        loadingAble
        title={t('pages.sesameAccessControlDevice.index.SelectAuthenticationDevice')}
        selectableRows={'multiple'}
        setOpenModal={setCustomModalOpen}
        handleClose={() => {
          setCustomModalOpen(false);
        }}
        data={canChoosedAcDevices}
        handleCheck={handleCheck}
        location={location}
        isWifi={true}
      />
    );
    setCustomModalOpen(true);
  };

  const handleDeleteData = async (cards) => {
    handleOpenModalChoose(async (devices, cb) => {
      for (const device of devices) {
        await gManageAuthData.sendDelCardsCmd(device.deviceUUID, cards);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      cb && cb(true);
      setCustomModalOpen(false);
    });
  };

  const handleCSVData = async (data) => {
    console.log('csv数据', data);
    let list = [];
    let isError = false;
    data.forEach((item) => {
      if (item.id || item.ID || item.cardID) {
        let obj = {
          cardID: item.id || item.ID || item.cardID,
          nameUUID: item.カード名 || item.name || '',
          cardType: item.cardType || '02',
        };
        if (item.ユーザー) {
          let member = gManageEmployee.employees.Items.find((it) => it.subUUID === item.ユーザー);
          if (member) {
            obj.memberID = member.subUUID;
          }
        }
        if (obj.cardID) {
          list.push(obj);
        }
      } else {
        isError = true;
      }
    });
    if (isError) {
      return;
    }
    handleOpenModalCsv(async (devices) => {
      try {
        for (const device of devices) {
          console.log(`开始处理设备: ${device.deviceUUID}`);
          const uploadedData = await uploadCardBatch({
            deviceUUID: device.deviceUUID,
            list,
          });
          await new Promise((resolve, _reject) => {
            gManageAuthData.postCards({
              deviceUUID: uploadedData.deviceUUID,
              list: uploadedData.list,
              cb: (res) => {
                console.log(`设备 ${device.deviceUUID} 卡片已保存到数据库`, res);
                resolve(res);
              },
            });
          });
          console.log(`设备 ${device.deviceUUID} 处理完成`);
          floatingAddRef.current?.handleClose();
        }
        console.log('所有设备处理完毕');
      } catch (error) {
        console.error('处理过程中出错:', error);
      }
    });
  };

  const processedCardOperations = new Set();
  const cardChangeCallback = async (deviceUUID, data) => {
    console.log('cardChangeCallback', deviceUUID, data);
    if (touchList.length < 1) {
      return;
    }
    if (!data || typeof data !== 'object' || !data.c) {
      return;
    }
    const cardInfo = biz3utils.parseHexStrToCardInfo(data.c);
    const cardID = cardInfo.cardID;
    const deviceSet = new Set(touchList.map((d) => d.deviceUUID));
    const sortedDevices = Array.from(deviceSet).sort().join('_');
    const operationId = `${cardID}_${sortedDevices}`;
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
    const needAddedDevices = touchList.filter((item) => item.deviceUUID !== deviceUUID);
    for (const item of needAddedDevices) {
      const payload = biz3utils.buildPayloadCardAdd({ cardID });
      let base64 = Buffer.from(payload).toString('base64');
      let cmd = {
        topic: `stp${item.deviceUUID}cmd`,
        payload: base64,
        op: gConfig.cmdCode.SSM_OS3_CARD_ADD,
      };
      await sendCmd(cmd);
    }
  };

  const recentlyAddedCards = useMemo(() => {
    if (recentAddedCards.length < 1) {
      return [];
    }
    return tbData.filter((item) => recentAddedCards.includes(item.cardID));
  }, [recentAddedCards, tbData]);

  useEffect(() => {
    return () => {
      processedCardOperations.clear();
    };
  }, []);

  const handleCarSetInputMode = async (isInput) => {
    for (const item of touchList) {
      await sendCmd(
        biz3utils.buildPayloadModeSet({ uuid: item.deviceUUID, type: sesameTouchProAuthType.card, insertOn: isInput })
      );
    }
    setRecentAddedCards([]);
    processedCardOperations.clear();
    if (isInput) {
      registerIotCallback(gConfig.cmdCode.SSM_OS3_CARD_CHANGE, cardChangeCallback);
    } else {
      unregisterIotCallback(gConfig.cmdCode.SSM_OS3_CARD_CHANGE);
    }
  };

  const addIcCardComponent = useMemo(
    () => (
      <Collapse in={true}>
        <AddIcCard
          ref={addIcCardRef} // 传递 ref
          isShowCsv={!gMediaType.isMobile}
          csvLoading={uploadState !== 'Idle'}
          mdatas={recentlyAddedCards}
          setTouchList={setTouchList}
          touchList={touchList}
          downData={tbData}
          setCsvData={(data) => {
            handleCSVData(data);
          }}
          chooseOpenHold={chooseOpen}
          setChooseOpenHold={setChooseOpen}
          location={location}
          goSet={async (isChoose) => {
            handleCarSetInputMode(isChoose);
          }}
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
      </Collapse>
    ),
    [gMediaType.isMobile, uploadState, recentlyAddedCards, touchList, tbData, chooseOpen, location]
  );

  return (
    <SesameFloatingAdd
      ref={floatingAddRef}
      isMobile={gMediaType.isMobile}
      popupComponent={addIcCardComponent}
      onClose={() => {
        handleCarSetInputMode(false);
        setTouchList([]);
      }}
    >
      <DataTable
        isMobile={gMediaType.isMobile}
        data={tbData}
        callBind={bindOpenModalChoose}
        refreshTb={refreshTb}
        columns={DataTableColumns.cardColumns({
          isMobile: gMediaType.isMobile,
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
            search: createSearchParams({ did: tbData[index].cardID }).toString(),
          });
        }}
        callDelData={(items) => {
          handleDeleteData(items);
        }}
        callSelects={(lists) => {
          setTbSelect(lists);
        }}
        callSearch={(e) => {
          if (!e) {
            setTbData(uniqueCards);
          } else {
            const reuslt = uniqueCards.filter((item) => {
              const linkedmember = gManageEmployee.findEmployeeById(item.subUUID);
              const findEmployeeName = linkedmember?.employeeName?.includes(e);
              const findId = biz3utils.formatCardID(item.cardID).includes(e.toLowerCase());
              const findSimpleID = item.cardID.toLowerCase().includes(e.toLowerCase());
              const findCardName = item.name?.includes(e);
              return findCardName || findEmployeeName || findId || findSimpleID;
            });
            setTbData(reuslt);
          }
        }}
      />
    </SesameFloatingAdd>
  );
}
