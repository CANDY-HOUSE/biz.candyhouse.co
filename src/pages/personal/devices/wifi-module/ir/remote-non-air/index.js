import React, { useContext, useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardContent, Box, Typography, IconButton, Grid, Paper } from '@mui/material';
import { KeyboardArrowLeft as KeyboardArrowLeftIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useRemoteCtrl } from '@/api/useRemoteCtrl.js';
import { HXDCommandProcessor } from '../utils/HXDCommandProcessor';
import EditableText from '@/components/EditableText.js';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils.js';
import { getRemotePanel } from './panels/index.js';
import { IR_TYPE } from '../utils/irTypes.js';
import { getNonAirKeyId, isNonAirKeyAvailable, getNonAirPowerOnKeyId, getNonAirPowerOffKeyId } from './keyIds.js';

const RemoteNonAir = () => {
  const navigate = useNavigate();
  const [clickedItem, setClickedItem] = useState(null);
  const [searchParams] = useSearchParams();

  const hub3DeviceId = searchParams.get('hub3DeviceId');
  const [remote, setRemote] = useState({});

  const commandProcessor = useMemo(() => new HXDCommandProcessor(), []);
  const { gAuth, gStripe, setSnackbarValue, gMediaType } = useContext(GlobalStateContext);
  const { sendIR, updateRemoteState, addIRRemote, modifyIRRemote, addRemoteToMatter, updateLocalRemoteList } =
    useRemoteCtrl(gAuth, gStripe, setSnackbarValue);
  const [hasRemoteSave, setHasRemoteSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localRemoteAlias, setLocalRemoteAlias] = useState('');
  const [command, setCommand] = useState('');
  const [matchedRemotes, setMatchedRemotes] = useState([]);
  const { t } = useTranslation();
  const isMobile = gMediaType.isMobile;

  useEffect(() => {
    const initializeRemote = () => {
      const storedMatchResult = sessionStorage.getItem('autoMatchResult');
      if (storedMatchResult) {
        try {
          const matchData = JSON.parse(storedMatchResult);
          const isRecent = Date.now() - matchData.timestamp < 3000;

          if (matchData.fromAutoMatch && matchData.selectedRemote && isRecent) {
            const newRemote = matchData.selectedRemote.irRemote || matchData.selectedRemote;
            console.log('提取的 irRemote 数据:', newRemote);
            setRemote(newRemote);
            console.log('提取的 matchedRemotes 数据:', matchData.matchedRemotes.length);
            setMatchedRemotes(matchData.matchedRemotes || []);

            sessionStorage.removeItem('autoMatchResult');
            console.log('已清理 sessionStorage 中的匹配结果');
            return;
          } else {
            sessionStorage.removeItem('autoMatchResult');
          }
        } catch (error) {
          console.error('parse sessionStorage match Result error:', error);
          sessionStorage.removeItem('autoMatchResult');
        }
      }
      const defaultRemote = searchParams.get('remote');
      if (defaultRemote) {
        try {
          setRemote(JSON.parse(defaultRemote));
          console.log('已使用默认 remote 参数初始化');
        } catch (error) {
          console.error('parse default remote parameter error:', error);
        }
      } else {
        console.warn('没有找到 remote 参数');
      }
    };

    initializeRemote();
  }, []);

  useEffect(() => {
    const isSaved = remote?.uuid && remote.uuid.trim() !== '';
    setHasRemoteSave(isSaved);
    setLocalRemoteAlias(remote?.alias || '');
    console.log('remote update :', remote);
  }, [remote]);

  // 按遥控器来源加载按键面板：HXD（code < 30000）用 panels/hxdPanels.js，SwitchBot 用 panels/switchbotPanels.js。
  // 遥控器数据还没加载（没有 code，判断不了来源）时先不画按钮。
  const deviceConfig = useMemo(
    () => (remote.code === undefined || remote.code === null ? [] : getRemotePanel(remote.type, remote.code, t)),
    [remote.type, remote.code, t]
  );

  // 获取设备类型显示名称
  const getDeviceTypeName = () => {
    const irTypeNum = parseInt(remote.type);
    const typeNames = {
      [IR_TYPE.FANS]: t('pages.ir.list.fan'),
      [IR_TYPE.LIGHT]: t('pages.ir.list.light'),
      [IR_TYPE.TV]: t('pages.ir.list.tv'),
      [IR_TYPE.IPTV]: t('pages.ir.list.iptv'),
      [IR_TYPE.STB]: t('pages.ir.list.stb'),
      [IR_TYPE.DVD]: t('pages.ir.list.dvd'),
      [IR_TYPE.PJT]: t('pages.ir.list.projector'),
      [IR_TYPE.DC]: t('pages.ir.list.camera'),
      [IR_TYPE.AP]: t('pages.ir.list.airPurifier'),
      [IR_TYPE.AUDIO]: t('pages.ir.list.audio'),
      [IR_TYPE.HW]: t('pages.ir.list.waterHeater'),
      [IR_TYPE.ROBOT]: t('pages.ir.list.robot'),
    };
    return typeNames[irTypeNum];
  };

  // 构建命令的函数
  // 键号按 keyIds.js 取（1..N = HXD 码表列号，64 起 = SwitchBot 独有键），后端用同一份映射找码。
  // 返回 null 表示这台遥控器没有这个键（码源里就没有这一列），不发；返回 '' 表示构建出错。
  const buildCommand = (item, remoteDevice) => {
    try {
      const key = getNonAirKeyId(remote.type, item.id);
      console.log('buildCommand item:', item.id, 'key:', key, 'code:', remoteDevice.code, 'irType:', remote.type);
      if (!isNonAirKeyAvailable(remote.type, remoteDevice.code, key)) {
        return null;
      }
      const command = commandProcessor.setKey(key).setCode(remoteDevice.code).buildNonAirCommand();
      return commandProcessor.toHexString(command);
    } catch (error) {
      console.error('buildCommand error:', error);
      return '';
    }
  };

  // 计算网格行数
  const getGridRows = () => {
    const maxRow = Math.max(...deviceConfig.map((item) => item.position.row));
    return maxRow + 1;
  };

  // 处理项目点击
  const handleItemClick = async (item) => {
    if (!item.clickable || clickedItem) return;

    setClickedItem(item.id);

    try {
      // 构建并发送红外码
      let cmd = buildCommand(item, remote);
      if (cmd === null) {
        setSnackbarValue({
          open: true,
          // msg: t('pages.ir.remote.keyNotAvailable'),
          severity: 'info',
        });
        return;
      }
      setCommand(cmd);
      if (!cmd) {
        console.error('handleItemClick buildCommand is empty!');
        setSnackbarValue({
          open: true,
          msg: t('pages.ir.remote.operationFailed'),
          severity: 'error',
        });
        return;
      }

      console.log('handleItemClick buildCommand:', cmd, 'device:', hub3DeviceId);

      // 使用 sendIR 发送红外码
      let remoteId = remote.uuid || '';
      sendIR(hub3DeviceId, remoteId, cmd, 'remoteEmit', remote.type, (response) => {
        if (response.success) {
          console.log('send IR code sent successfully:', response.data);
          if (remote.uuid) {
            updateRemoteState(hub3DeviceId, remote.uuid, cmd, (updateResponse) => {
              if (updateResponse.success) {
                console.log('device state updated successfully:', remote.uuid, cmd);
              } else {
                console.error('device state update failed:', updateResponse.message);
              }
            });
          }
        } else if (response.code === 406) {
          // 后端找不到这台遥控器这个键的码（HXD 码表该列为空 / SwitchBot 数据里没有）。
          // useRemoteCtrl 对 406 是全局静默的（空调页依赖这点），所以在这里单独提示。
          console.warn('IR key not available:', response.message);
          setSnackbarValue({
            open: true,
            // msg: t('pages.ir.remote.keyNotAvailable'),
            severity: 'info',
          });
        } else {
          console.error('IR code send failed:', response.message);
        }
      });
    } catch (error) {
      console.error('handleItemClick error:', error);
      setSnackbarValue({
        open: true,
        msg: t('pages.ir.remote.operationFailed'),
        severity: 'error',
      });
    } finally {
      // 重置点击状态
      setTimeout(() => {
        setClickedItem(null);
      }, 1000);
    }
  };
  const handleMatchClick = async () => {
    navigate({
      pathname: '/biz/access-control/remote-match',
      search: createSearchParams({
        hub3DeviceId: hub3DeviceId,
        remote: JSON.stringify(remote),
        matchedRemotes: JSON.stringify(matchedRemotes),
        ...(gStripe.isFromApp && { fromType: 'app' }),
      }).toString(),
    });
  };

  // 处理修改
  const handleModify = (newValue, onComplete) => {
    try {
      if (!remote.uuid || remote.uuid.trim() === '') {
        onComplete(true);
        setLocalRemoteAlias(newValue);
        return;
      }

      modifyIRRemote(hub3DeviceId, remote.uuid, newValue, (response) => {
        console.log('modifyIRRemote callback response:', response);

        if (response.success) {
          onComplete(true);
          console.log('remote modified successfully:', response.data);
          remote.alias = newValue;
          setLocalRemoteAlias(newValue);
          updateLocalRemoteList(hub3DeviceId, remote);
        } else {
          onComplete(false);
          console.error('remote modification failed:', response.message);
          setSnackbarValue({
            open: true,
            msg: t('pages.ir.remote.updateIRRemoteFail'),
            severity: 'error',
          });
        }
      });
    } catch (error) {
      console.error('handleModify error:', error);
      setSnackbarValue({
        open: true,
        msg: t('pages.ir.remote.handleFailed'),
        severity: 'error',
      });
    }
  };

  const addIRRemoteToMatter = (remoteToSave) => {
    const onCommand = getPowerOnCommand(remoteToSave);
    const offCommand = getPowerOffCommand(remoteToSave);
    addRemoteToMatter(hub3DeviceId, onCommand, offCommand, remoteToSave, (response) => {
      console.log('addRemoteToMatter callback response:', response);
    });
  };
  // Matter 桥接只有「开」「关」两个动作：按码源挑覆盖率最高的电源键（如投影仪 HXD 用开机/关机两列，
  // SwitchBot 用单一电源键），见 keyIds.js 的 POWER_KEYS。
  const getPowerOffCommand = (remoteToSave) => {
    const key = getNonAirPowerOffKeyId(remoteToSave.type, remoteToSave.code) ?? 0x01;
    return commandProcessor.toHexString(commandProcessor.setKey(key).setCode(remoteToSave.code).buildNonAirCommand());
  };

  const getPowerOnCommand = (remoteToSave) => {
    const key = getNonAirPowerOnKeyId(remoteToSave.type, remoteToSave.code) ?? 0x01;
    return commandProcessor.toHexString(commandProcessor.setKey(key).setCode(remoteToSave.code).buildNonAirCommand());
  };

  // 处理保存
  const handleSave = () => {
    if (isSaving) return; // 防止重复保存
    setIsSaving(true);

    try {
      const remoteToSave = {
        uuid: biz3utils.generateUUID(),
        model: remote.model,
        state: command,
        alias: localRemoteAlias,
        code: remote.code,
        type: remote.type,
        deviceUUID: hub3DeviceId,
        keys: [],
      };

      addIRRemote(remoteToSave, (response) => {
        console.log('addIRRemote callback response:', response);

        if (response.success) {
          console.log('remote saved successfully:', response.data);
          remote.uuid = remoteToSave.uuid;
          setHasRemoteSave(true);
          updateLocalRemoteList(hub3DeviceId, remoteToSave);
          addIRRemoteToMatter(remoteToSave);
        } else {
          console.error('remote save failed:', response.message);
          setIsSaving(false);
          setSnackbarValue({
            open: true,
            msg: t(response.message || 'pages.ir.remote.addIRRemoteFail'),
            severity: 'error',
          });
        }
      });
    } catch (error) {
      setIsSaving(false);
      console.error('handleSave error:', error);
      setSnackbarValue({
        open: true,
        msg: t('pages.ir.remote.handleFailed'),
        severity: 'error',
      });
    }
  };

  const gridRows = getGridRows();

  return (
    <Card
      sx={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        margin: 0,
        '& .MuiCardContent-root': {
          padding: 0,
        },
      }}
    >
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {!isMobile && (
              <IconButton onClick={() => navigate(-1)} sx={{ flexShrink: 0, mr: 1 }}>
                <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
              </IconButton>
            )}
            <Box sx={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden', mr: 1 }}>
              <EditableText
                style={{
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  lineHeight: '1.3',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                initialValue={remote.alias}
                onSave={
                  hasRemoteSave
                    ? (newValue, callback) => {
                        if (!newValue || !callback) {
                          return;
                        }
                        handleModify(newValue, (success) => {
                          callback(success);
                        });
                      }
                    : null
                }
              />
            </Box>
            {!hasRemoteSave && (
              <IconButton onClick={handleSave} sx={{ flexShrink: 0 }}>
                <CheckCircleOutlineIcon />
              </IconButton>
            )}
          </Box>
        }
        sx={{
          pb: 1,
          px: '10px',
          '& .MuiCardHeader-content': {
            overflow: 'hidden',
          },
        }}
      />

      <CardContent
        sx={{
          display: 'flex',
          // 按键多的品类（如音响 29 键、DVD 31 键）内容会超出一屏，需可滚动
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
          minHeight: 0,
          width: '100%',
          padding: 0,
          margin: 0,
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            px: 1,
            width: '100%',
            maxWidth: 1080,
            display: 'flex',
            padding: 0,
            margin: 0,
            // 给底部固定的「自动匹配」提示条留出空间，避免压住最后一行按键
            pb: '104px',
            justifyContent: 'center',
          }}
        >
          <Grid container spacing={0} sx={{ width: '100%' }}>
            {Array.from({ length: gridRows }, (_, row) => (
              <Grid item xs={12} key={row}>
                <Grid container>
                  {[0, 1, 2].map((col) => {
                    const item = deviceConfig.find((item) => item.position.row === row && item.position.col === col);
                    if (!item) {
                      return (
                        <Grid item xs={4} key={`${row}-${col}`}>
                          <Paper
                            elevation={0}
                            sx={{
                              height: 80,
                              borderRight: 'none',
                              borderBottom: 'none',
                            }}
                          />
                        </Grid>
                      );
                    }
                    const showRightBorder = col < 2;
                    const showBottomBorder = deviceConfig.some(
                      (i) => i.position.row === row + 1 && i.position.col === col
                    );

                    const isClicked = clickedItem === item.id;

                    return (
                      <Grid item xs={4} key={item.id}>
                        <Paper
                          elevation={0}
                          sx={{
                            height: 125,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: item.clickable ? 'pointer' : 'default',
                            borderRight: showRightBorder ? '1px solid' : 'none',
                            borderBottom: showBottomBorder ? '1px solid' : 'none',
                            borderColor: 'divider',
                            borderRadius: 0,
                            opacity: isClicked ? 0.3 : 1,
                            transition: 'opacity 0.2s',
                            margin: 0,
                          }}
                          onClick={() => handleItemClick(item)}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '1.2rem',
                              textAlign: 'center',
                              opacity: isClicked ? 0.3 : 1,
                              lineHeight: 1.2,
                              fontWeight: 'normal',
                              color: 'inherit',
                            }}
                          >
                            {item.title}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box
          sx={{
            position: 'fixed',
            // 贴到视口底边：若留出间隙，滚动内容会从底部缝隙里透出来
            bottom: 0,
            pt: 4,
            pb: '20px',
            backgroundColor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          {!hasRemoteSave && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
                py: 1,
                cursor: 'pointer',
                borderTop: '1px solid',
                borderColor: 'divider',
                width: '100%',
              }}
              onClick={() => handleMatchClick()}
            >
              <Typography variant="body2" color="text.secondary">
                {t('pages.ir.remote.cannotControlAutoMatchRemote', { type: getDeviceTypeName() })} &gt;
              </Typography>
            </Box>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 1,
              fontSize: '0.7rem',
            }}
          >
            HXD {remote?.alias}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RemoteNonAir;
