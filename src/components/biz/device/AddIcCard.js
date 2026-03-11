import React, { forwardRef, useImperativeHandle, useContext, useState, useEffect } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import CheckTable from '../CheckTable';
import { Card, CardHeader, IconButton, Box, Typography, CardContent } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CancelRounded from '@mui/icons-material/CancelRounded';
import Cfpuploaddata from './CfpUploadData';
import CSVHandler from './CSVHandler';
import CfpSimpleTable from './CfpSimpleTable';
import { useTranslation } from 'react-i18next';
import { gUtils } from '@/utils/gUtils';

const AddIcCard = forwardRef(
  (
    {
      mdatas,
      goSet,
      addCard,
      downData,
      setCsvData,
      touchList,
      setTouchList,
      isShowFileClick,
      chooseOpenHold,
      isUploadCsvCall,
      setChooseOpenHold,
      csvLoading,
      isShowCsv = true,
    },
    ref
  ) => {
    const { t } = useTranslation(); // i18n
    const { gManageDevice, setCustomModalOpen, setModalContent } = useContext(GlobalStateContext);

    const [readCardContent, setReadCardContent] = useState(false);
    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      setReadCardContent: (content) => {
        setReadCardContent(content);
      },
    }));

    const [list, setList] = useState([]);

    useEffect(() => {
      setList(touchList);
      if (touchList.length === 0) {
        setReadCardContent(false);
      }
    }, [touchList]);

    useEffect(() => {
      if (chooseOpenHold) {
        handleOpenModal();
      } else {
        setCustomModalOpen(false);
      }
    }, [chooseOpenHold]);

    const readCardClick = () => {
      let nIschoose = !readCardContent;
      if (goSet) {
        goSet(nIschoose);
      }
    };

    const handleOpenModal = () => {
      let listDevices = gManageDevice.filteredAccessControlDevices.filter(
        (item) => item.stateInfo.wm2State && !touchList.some((obj) => obj.deviceUUID === item.deviceUUID)
      );
      setModalContent(
        <CheckTable
          title={t('pages.sesameAccessControlDevice.index.SelectAuthenticationDevice')}
          selectableRows={'multiple'}
          data={listDevices} //資料
          setOpenModal={setCustomModalOpen} //開關Modal的屬性
          handleCheck={handleCheck} //勾選項目後要做的處理function
          isWifi={true}
        />
      );
      setCustomModalOpen(true);
    };

    // 勾選項目後要做的處理function要寫這裡
    const handleCheck = (selectedItems) => {
      setCustomModalOpen(false);
      setChooseOpenHold(false);
      setTouchList([...selectedItems, ...touchList]);
    };

    return (
      <Card sx={{ mb: '15px' }}>
        <CardHeader
          title={
            <Box
              sx={{
                display: 'flex',
                mb: '10px',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="h2" sx={{ ml: '9px' }}>
                新規カード追加
              </Typography>
              {isShowCsv && (
                <Box sx={{ display: 'flex' }}>
                  <CSVHandler
                    hint={gUtils.authText.fontCfpCards.warningMsg}
                    loading={csvLoading}
                    setData={setCsvData}
                    isShowFileClick={isShowFileClick}
                    downData={downData}
                    isUserData={false}
                    isUploadCsv={list.length > 0}
                    isUploadCsvCall={isUploadCsvCall}
                  />
                </Box>
              )}
            </Box>
          }
        />
        <CardContent>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h3" sx={{ ml: '9px' }}>
                {`1.${t('pages.sesameAccessControlDevice.index.SelectAuthenticationDevice')}`}
              </Typography>
              <IconButton
                onClick={() => {
                  handleOpenModal();
                }}
              >
                <AddCircleIcon style={{ color: '#28AEB1' }} />
              </IconButton>
            </Box>
            {list.length > 0 && (
              <Box sx={{ p: '15px' }}>
                <CfpSimpleTable
                  items={list}
                  btnDel={(item) => {
                    setTouchList((prevState) => prevState.filter((obj) => obj.deviceUUID !== item.deviceUUID));
                  }}
                  name={'deviceName'}
                />
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h3" sx={{ ml: '9px' }}>
              {'2.カード読み取り'}
            </Typography>
            <IconButton
              disabled={list.length === 0}
              onClick={readCardClick}
              size="small"
              variant="outlined"
              sx={{
                color: '#28AEB1',
              }}
            >
              {!readCardContent ? (
                <AddCircleIcon style={{ color: list.length === 0 ? 'rgba(0, 0, 0, 0.26)' : '#28AEB1' }} />
              ) : (
                <CancelRounded style={{ color: '#28AEB1' }} />
              )}
            </IconButton>
          </Box>
          <Cfpuploaddata
            b2t={'＋ボタンを押しタッチ/タッチプロにカードをかざして下さい。'}
            addCard={addCard}
            cards={mdatas}
            readCardContent={readCardContent}
          />
        </CardContent>
      </Card>
    );
  }
);

export default AddIcCard;
