import BackButton from '@/components/BackButton';
// /biz/ir/ir-type-list/index.js
import React, { useContext } from 'react';
import { Box, Card, CardContent, CardHeader, IconButton, List, ListItem, Typography } from '@mui/material';
import { useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useTranslation } from 'react-i18next';
import { SvgAir, SvgFan, SvgLearn, SvgLight, SvgTV } from '@assets/svg/ir/svgIR';
// 新增品类暂用 MUI 自带图标（已是项目依赖，Apache-2.0）；待设计出图后替换为 png_*.png
import LiveTvIcon from '@mui/icons-material/LiveTv';
import DvrIcon from '@mui/icons-material/Dvr';
import AlbumIcon from '@mui/icons-material/Album';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AirIcon from '@mui/icons-material/Air';
import SpeakerIcon from '@mui/icons-material/Speaker';
import ShowerIcon from '@mui/icons-material/Shower';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import { IR_TYPE } from '../utils/irTypes.js';
import { deleteSearchCache } from '../utils/remoteListCache.js';
import { GlobalStateContext } from '@context/GlobalContextProvider';

export default function IrTypeList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const hub3DeviceId = searchParams.get('hub3DeviceId') || '';
  const { gMediaType, gStripe } = useContext(GlobalStateContext);
  const isMobile = gMediaType.isMobile;
  // 新增品类的 MUI 图标尺寸，与既有 32x32 的 png 图标对齐
  const svgIconStyle = { width: 32, height: 32, color: 'text.primary' };

  // 红外设备类型列表
  const irTypes = [
    {
      id: 'air',
      type: 0xc000,
      name: t('pages.ir.list.airConditioner'),
      icon: <SvgAir />,
    },
    {
      id: 'tv',
      type: 0x2000,
      name: t('pages.ir.list.tv'),
      icon: <SvgTV />,
    },
    {
      id: 'light',
      type: 0xe000,
      name: t('pages.ir.list.light'),
      icon: <SvgLight />,
    },
    {
      id: 'fan',
      name: t('pages.ir.list.fan'),
      type: 0x8000,
      icon: <SvgFan />,
    },
    {
      id: 'iptv',
      type: IR_TYPE.IPTV,
      name: t('pages.ir.list.iptv'),
      icon: <LiveTvIcon sx={svgIconStyle} />,
    },
    {
      id: 'stb',
      type: IR_TYPE.STB,
      name: t('pages.ir.list.stb'),
      icon: <DvrIcon sx={svgIconStyle} />,
    },
    {
      id: 'dvd',
      type: IR_TYPE.DVD,
      name: t('pages.ir.list.dvd'),
      icon: <AlbumIcon sx={svgIconStyle} />,
    },
    {
      id: 'projector',
      type: IR_TYPE.PJT,
      name: t('pages.ir.list.projector'),
      icon: <SlideshowIcon sx={svgIconStyle} />,
    },
    {
      id: 'audio',
      type: IR_TYPE.AUDIO,
      name: t('pages.ir.list.audio'),
      icon: <SpeakerIcon sx={svgIconStyle} />,
    },
    {
      id: 'airPurifier',
      type: IR_TYPE.AP,
      name: t('pages.ir.list.airPurifier'),
      icon: <AirIcon sx={svgIconStyle} />,
    },
    {
      id: 'waterHeater',
      type: IR_TYPE.HW,
      name: t('pages.ir.list.waterHeater'),
      icon: <ShowerIcon sx={svgIconStyle} />,
    },
    {
      id: 'robot',
      type: IR_TYPE.ROBOT,
      name: t('pages.ir.list.robot'),
      icon: <CleaningServicesIcon sx={svgIconStyle} />,
    },
    {
      id: 'camera',
      type: IR_TYPE.DC,
      name: t('pages.ir.list.camera'),
      icon: <PhotoCameraIcon sx={svgIconStyle} />,
    },
    // 学习始终排在最后
    {
      id: 'learn',
      type: 0xfeff,
      name: t('pages.ir.list.learn'),
      icon: <SvgLearn />,
    },
  ];

  // 处理类型选择
  const handleTypeSelect = (selectedType) => {
    localStorage.removeItem('formRemoteControlKey');
    deleteSearchCache(selectedType.type);
    let pathname = '/biz/access-control/remotes';
    if (selectedType.id === 'learn') {
      pathname = '/biz/access-control/learn';
    }
    navigate({
      pathname: pathname,
      search: createSearchParams({
        hub3DeviceId: hub3DeviceId,
        irType: selectedType.type,
        ...(gStripe.isFromApp && { fromType: 'app' }),
      }).toString(),
    });
  };

  const listItemStyle = {
    display: 'flex',
    alignItems: 'center',
    px: 2,
    py: 2,
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
    '&:last-child': {
      borderBottom: 'none',
    },
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isMobile && <BackButton onClick={() => navigate(-1)}></BackButton>}
            <Typography
              variant="h6"
              sx={{
                fontSize: '1.2em',
                fontWeight: 'bold',
                lineHeight: '1.3',
                ml: 1,
              }}
            >
              {t('remoteControl.selectType', 'リモコンタイプを選択')}
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <List disablePadding>
          {irTypes.map((type, _index) => (
            <ListItem key={type.id} sx={listItemStyle} onClick={() => handleTypeSelect(type)}>
              <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>{type.icon}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {type.name}
                </Typography>
              </Box>

              <IconButton
                sx={{
                  p: 1,
                  color: 'text.secondary',
                  pointerEvents: 'none',
                }}
              >
                <KeyboardArrowRightIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
