import React, { useState, useEffect, useContext } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { KeyboardArrowLeft as KeyboardArrowLeftIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useRemoteCtrl } from '@/api/useRemoteCtrl.js';
import irMatchImage from '@/assets/svg/ir/png_ir_match.png';
import { useTranslation } from 'react-i18next';

const RemoteMatch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { gAuth, gStripe, setSnackbarValue, gMediaType } = useContext(GlobalStateContext);
  const { getIRMode, setIRMode, subscribeIRMode, subscribeIRData, unsubscribeIRMode, unsubscribeIRData, matchRemote } =
    useRemoteCtrl(gAuth, gStripe, setSnackbarValue);

  // 状态管理
  const [matchedRemotes, setMatchedRemotes] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isLearningMode, setIsLearningMode] = useState(false);

  // 从路由参数获取数据
  const hub3DeviceId = searchParams.get('hub3DeviceId');
  const remote = JSON.parse(searchParams.get('remote') || '{}');

  const existingResults = location.state?.searchResults || [];
  const { t } = useTranslation();
  const isMobile = gMediaType.isMobile;

  // 常量定义
  const IR_MODE = {
    CONTROL: 0,
    REGISTER: 1,
  };

  useEffect(() => {
    let list = JSON.parse(searchParams.get('matchedRemotes') || '[]');
    setMatchedRemotes(list);
  }, []);

  // 获取设备类型显示名称
  const getDeviceTypeName = () => {
    const irTypeNum = parseInt(remote.type);
    const typeNames = {
      0x8000: t('pages.ir.list.fan'),
      0xe000: t('pages.ir.list.light'),
      0x2000: t('pages.ir.list.tv'),
      0xc000: t('pages.ir.list.airConditioner'),
    };
    return typeNames[irTypeNum];
  };

  // 设置IR模式
  const setMode = (mode) => {
    console.log('set IR mode', mode);
    setIRMode(hub3DeviceId, mode, (response) => {
      if (!response.success) {
        console.error('set IR mode failed:', response.message);
        setSnackbarValue({
          open: true,
          msg: t('pages.ir.remote.setIRModeFail'),
          severity: 'error',
        });
      }
    });
  };

  // 订阅IR模式变化
  const subscribeIRModeChanges = () => {
    subscribeIRMode(hub3DeviceId, (response) => {
      console.log('received IR mode change notification:', response);
      if (response.success) {
        try {
          let mode = response.data.data.ir_mode;
          console.log('received IR mode:', mode);
          if (isLearningMode && mode !== IR_MODE.REGISTER) {
            setTimeout(() => {
              if (isLearningMode && mode !== IR_MODE.REGISTER) {
                setMode(IR_MODE.REGISTER);
              }
            }, 500);
          }
        } catch (error) {
          console.error('parse IR mode data failed:', error);
        }
      } else {
        console.error('subscribe IR mode failed:', response.message);
        setIsConnected(false);
      }
    });

    // 获取当前IR模式
    getIRMode(hub3DeviceId, (response) => {
      console.info('get current IR mode response:', response);
      if (response.success) {
        try {
          let mode;
          if (response.data && typeof response.data === 'object') {
            mode = response.data.ir_mode || response.data.mode;
          } else if (typeof response.data === 'number') {
            mode = response.data;
          }

          if (mode !== undefined) {
            console.log('current IR mode:', mode);

            // 如果不是注册模式，设置为注册模式
            if (mode !== IR_MODE.REGISTER) {
              setMode(IR_MODE.REGISTER);
            }
          }
        } catch (error) {
          console.error('parse IR mode data failed:', error);
        }
      } else {
        console.error('get IR mode failed:', response.message);
      }
    });
  };

  // 订阅学习数据
  const subscribeIRDataChanges = () => {
    subscribeIRData(hub3DeviceId, (response) => {
      if (response.success) {
        console.log('received learning data, size:', response.data.data ? response.data.data.length : 0);
        if (matchedRemotes.length === 0) {
          setIsSearching(true);
        }
        if (!response.data.data || response.data.data.length <= 50) {
          console.log('learning data is empty, continue waiting...');
          setTimeout(() => {
            setIsLearningMode(true);
            setMode(IR_MODE.REGISTER);
          }, 500);
          return;
        }
        setIsLearningMode(false);
        setMode(IR_MODE.CONTROL);
        // 调用匹配API
        matchRemote(response.data.data, parseInt(remote.type), remote.model, (matchResponse) => {
          setIsLearningMode(true);
          setMode(IR_MODE.REGISTER);
          if (matchResponse.success) {
            console.log('match successful:', matchResponse);
            const matchedList = parseMatchResults(matchResponse.data.matches, parseInt(remote.type));
            // const matchedList = matchResponse.data.matches
            if (matchedList.length === 0) {
              console.log('no match results found');
            } else {
              console.log('match results list:', matchedList);
              setMatchedRemotes(matchedList);
            }
            setIsSearching(false);
          } else {
            console.error('match failed:', matchResponse.message);
            setIsSearching(false);
            console.log('match failed, continue auto matching');
          }
        });
      } else {
        console.error('subscribe learning data failed:', response.message);
        setIsConnected(false);
        setIsLearningMode(true);
        setMode(IR_MODE.REGISTER);
      }
    });
  };

  // 解析匹配结果
  const parseMatchResults = (data, type) => {
    try {
      if (data) {
        return data.map((item) => {
          const controlType = item.controlType || {};
          const model = controlType.model || '';
          const alias = controlType.alias || '';
          const direction = controlType.direction || '';
          const brandCode = item.companyCode || -1;
          const bestMatchPercentage = item.bestMatchPercentage || 0;
          const matchPercent = `${bestMatchPercentage.toFixed(2)}%`;

          const irRemote = {
            model,
            alias,
            uuid: undefined,
            state: null,
            timestamp: Date.now(),
            type,
            code: brandCode,
            keys: null,
            direction,
          };

          return {
            irRemote,
            matchPercent,
          };
        });
      }
      return [];
    } catch (error) {
      console.error('parse match results failed:', error);
      return [];
    }
  };

  // 开始自动匹配
  const startAutoMatch = () => {
    console.log('start auto match');
    setIsLearningMode(true);
    setIsConnected(true);
    subscribeIRModeChanges();
    subscribeIRDataChanges();
    setMode(IR_MODE.REGISTER);
  };

  // 停止自动匹配
  const stopAutoMatch = () => {
    console.log('stop auto match');
    setIsLearningMode(false);
    unsubscribeIRData(hub3DeviceId);
    unsubscribeIRMode(hub3DeviceId);
    setMode(IR_MODE.CONTROL);
  };

  const handleRemoteSelect = (selectedRemote) => {
    console.log('selectedRemote:', selectedRemote);

    const matchData = {
      selectedRemote: selectedRemote,
      matchedRemotes: matchedRemotes,
      fromAutoMatch: true,
      timestamp: Date.now(),
    };
    sessionStorage.setItem('autoMatchResult', JSON.stringify(matchData));
    navigate(-1);
  };

  // 组件挂载时开始自动匹配
  useEffect(() => {
    if (hub3DeviceId && remote.type && remote.model) {
      // 如果有已存在的搜索结果，直接显示
      if (existingResults.length > 0) {
        setMatchedRemotes(existingResults);
      }
      setIsSearching(true);
      startAutoMatch();
    }

    // 组件卸载时停止自动匹配
    return () => {
      console.log('component unmount, stop auto match');
      stopAutoMatch();
    };
  }, []);

  return (
    <Card
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isMobile && (
              <IconButton onClick={() => navigate(-1)}>
                <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
              </IconButton>
            )}
            <Typography
              variant="h6"
              sx={{
                fontSize: '1.2em',
                fontWeight: 'bold',
                lineHeight: '1.3',
                ml: 1,
              }}
            >
              {remote.model}
            </Typography>
          </Box>
        }
      />

      <CardContent
        sx={{
          flex: 1,
          pt: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pb: 0,
        }}
      >
        {!isConnected && (
          <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
            {t('pages.ir.remote.networkError')}
          </Alert>
        )}

        <Box sx={{ flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box
              component="img"
              src={irMatchImage}
              alt="IR Auto Match Introduction"
              sx={{
                width: '100%',
                height: 150,
                maxWidth: 300,
                objectFit: 'contain',
              }}
            />
          </Box>

          <Typography variant="body1" sx={{ mb: 2, px: 1 }}>
            {t('pages.ir.remote.matchInstruction')}
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            mb: '80px',
          }}
        >
          {isSearching && matchedRemotes.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                gap: 2,
              }}
            >
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                {t('pages.ir.remote.matchingRemote', { type: getDeviceTypeName() })}
              </Typography>
            </Box>
          )}

          {matchedRemotes.length > 0 && (
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                minHeight: 0,
              }}
            >
              <List sx={{ padding: 0 }}>
                {matchedRemotes.map((item, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: 56,
                      px: 2,
                      py: 1.5,
                      borderBottom: index < matchedRemotes.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                    onClick={() => handleRemoteSelect(item)}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 'medium',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          mr: 2,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.irRemote.alias || item.irRemote.model}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          flexShrink: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.matchPercent}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {!isSearching && matchedRemotes.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                gap: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('pages.ir.remote.noMatchResults', { type: getDeviceTypeName() })}
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'background.paper',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              textAlign: 'center',
              fontSize: '0.7rem',
            }}
          >
            HXD
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RemoteMatch;
