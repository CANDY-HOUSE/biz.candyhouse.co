// /biz/ir/ir-type-list/index.js
import React, { useContext } from 'react';
import { Box, Card, CardContent, CardHeader, IconButton, List, ListItem, Typography } from '@mui/material';
import { useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useTranslation } from 'react-i18next';
import { SvgAir, SvgFan, SvgLearn, SvgLight, SvgTV } from '@assets/svg/ir/svgIR';
import { GlobalStateContext } from '@context/GlobalContextProvider';

export default function IrTypeList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const hub3DeviceId = searchParams.get('hub3DeviceId') || '';
  const { gMediaType, gStripe } = useContext(GlobalStateContext);
  const isMobile = gMediaType.isMobile;
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
      id: 'learn',
      type: 0xfeff,
      name: t('pages.ir.list.learn'),
      icon: <SvgLearn />,
    },
  ];

  // 处理类型选择
  const handleTypeSelect = (selectedType) => {
    localStorage.removeItem('formRemoteControlKey');
    localStorage.removeItem(`remoteList_${selectedType.type}_search`);
    localStorage.removeItem(`remoteList_${selectedType.type}_searchTerm`);
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
