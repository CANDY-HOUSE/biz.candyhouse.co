import React, { useEffect, useState } from 'react';
import { Box, ListItemText, ListItemButton, Typography, Collapse, IconButton } from '@mui/material';
import { useLocation } from 'react-router-dom';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { gUtils } from '@/utils/gUtils';
import { navIconMap } from './navIcons';
import { ios } from '@/theme/appHomeStyle';

const itemSx = (selected) => ({
  minHeight: 40,
  px: '12px',
  py: 0,
  mb: '2px',
  borderRadius: '10px',
  backgroundColor: selected ? ios.tintFill : 'transparent',
  '&:hover': {
    backgroundColor: selected ? ios.tintFill : ios.pressed,
  },
});

const sxStyle = (matchPath, toPath) => itemSx(matchPath === toPath);

const labelSx = (active) => ({
  m: 0,
  '>span': {
    fontSize: 15,
    fontWeight: active ? 600 : 500,
    color: active ? ios.tint : 'inherit',
  },
});

export const NavigatorItem = ({ to, name, icon, location, external = false, onClick }) => {
  const [matchPath, setMatchPath] = useState('');
  const Icon = navIconMap[icon];

  useEffect(() => {
    if (location) {
      const currentPath = location.pathname === '/' ? '/' : location.pathname.split('/')[2];
      setMatchPath(currentPath);
    }
  }, [location]);

  const isActive = matchPath === (to === '/' ? '/' : to.split('/')[2]);

  return (
    <>
      <ListItemButton
        onClick={onClick}
        component={external ? 'a' : Link}
        to={to}
        target={external ? '_blank' : undefined}
        sx={external ? itemSx(false) : sxStyle(matchPath, to === '/' ? '/' : to.split('/')[2])}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {Icon && (
            <Icon
              {...(['contacts', 'me'].includes(icon) ? { selected: isActive } : {})}
              size={20}
              sx={{
                fontSize: 20,
                flexShrink: 0,
                color: isActive ? ios.tint : ios.secondaryLabel,
              }}
            />
          )}

          <ListItemText sx={labelSx(isActive)}>{name}</ListItemText>
        </Box>
      </ListItemButton>
    </>
  );
};

const getStyleAttributes = (matchPath, router) => {
  const isSectionMatched = matchPath.startsWith(router);
  if (matchPath === router || isSectionMatched) {
    return {
      backgroundColor: ios.tintFill,
      color: ios.tint,
      fontWeight: 600,
      '&:hover': { backgroundColor: ios.tintFill, cursor: 'pointer' },
    };
  } else {
    return {
      backgroundColor: 'transparent',
      color: ios.secondaryLabel,
      '&:hover': { backgroundColor: ios.pressed, cursor: 'pointer' },
    };
  }
};

const openStates = {};
export const NavigatorItemTop = ({ id, name, router, items, icon, onClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const currentPath = location.pathname;
  const [, forceUpdate] = useState({});
  const Icon = navIconMap[icon];
  if (openStates[id] === undefined) {
    openStates[id] = currentPath.startsWith(router);
  }

  const handleToggle = (e) => {
    if (items && items.length > 0) {
      e.stopPropagation();
      openStates[id] = !openStates[id];
      forceUpdate({});
    } else {
      onClick && onClick();
    }
  };

  const isRootPath = (path) => {
    return gUtils.categoriesConf
      .filter((it) => !!it.isRoot)
      .map((it) => it.router)
      .includes(path);
  };

  const isActive = isRootPath(router) ? currentPath === router : currentPath.startsWith(router);

  return (
    <>
      <ListItemButton
        key={id}
        component={items && items.length > 0 ? 'div' : Link}
        to={items && items.length > 0 ? undefined : `${router}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
        onClick={handleToggle}
        sx={isRootPath(router) ? sxStyle(currentPath, router) : sxStyle(currentPath)}
      >
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          {Icon && (
            <Icon
              {...(['contacts', 'me'].includes(icon) ? { selected: isActive } : {})}
              size={20}
              sx={{
                fontSize: 20,
                flexShrink: 0,
                color: isActive ? ios.tint : ios.secondaryLabel,
              }}
            />
          )}

          <ListItemText sx={labelSx(isActive)}>{name ? t(name) : id}</ListItemText>
        </Box>
        {items && items.length > 0 && (
          <IconButton size="small" sx={{ mr: '-6px', color: ios.tertiaryLabel }}>
            <KeyboardArrowDownRoundedIcon
              sx={{
                fontSize: 20,
                transform: openStates[id] ? 'none' : 'rotate(-90deg)',
                transition: `transform 0.3s ${ios.spring}`,
              }}
            />
          </IconButton>
        )}
      </ListItemButton>
      {items && (
        <Collapse in={openStates[id]} timeout="auto" unmountOnExit>
          {items.map(({ id, router }) => (
            <Typography
              key={id} // 添加唯一的 key 属性
              onClick={(e) => {
                e.stopPropagation();
                navigate(`${router}`);
                onClick && onClick();
              }}
              sx={{
                marginLeft: '32px',
                marginBottom: '2px',
                fontSize: '14px',
                lineHeight: '20px',
                padding: '8px 12px',
                borderRadius: '10px',
                fontWeight: 500,
                ...getStyleAttributes(currentPath, router),
              }}
            >
              {id}
            </Typography>
          ))}
        </Collapse>
      )}
    </>
  );
};
