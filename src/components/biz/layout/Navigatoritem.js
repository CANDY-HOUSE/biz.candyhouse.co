import React, { useEffect, useState } from 'react';
import { ListItemText, ListItemButton, Typography, Collapse, IconButton } from '@mui/material';
import { useLocation } from 'react-router-dom';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useNavigate, Link } from 'react-router-dom';
import { gUtils } from '@/utils/gUtils';

const sxStyle = (matchPath, toPath) => {
  return {
    borderRadius: '6px',
    backgroundColor: matchPath === toPath ? '#F8F8F8' : 'transparent',
    '&:hover': {
      backgroundColor: '#F8F8F8',
    },
  };
};

const externalStyle = () => {
  return {
    borderRadius: '6px',
    backgroundColor: '#fff',
    '&:hover': {
      backgroundColor: '#F8F8F8',
    },
  };
};

export const NavigatorItem = ({ to, name, location, external = false, onClick }) => {
  const [matchPath, setMatchPath] = useState('');

  useEffect(() => {
    if (location) {
      const currentPath = location.pathname === '/' ? '/' : location.pathname.split('/')[2];
      setMatchPath(currentPath);
    }
  }, [location]);

  return (
    <>
      <ListItemButton
        onClick={onClick}
        component={external ? 'a' : Link}
        to={to}
        target={external ? '_blank' : undefined}
        sx={external ? externalStyle : sxStyle(matchPath, to === '/' ? '/' : to.split('/')[2])}
      >
        <ListItemText sx={{ '>span': { fontWeight: 'bold' } }}>{name}</ListItemText>
      </ListItemButton>
    </>
  );
};

const getStyleAttributes = (matchPath, router) => {
  const isSectionMatched = matchPath.startsWith(router);
  if (matchPath === router || isSectionMatched) {
    return {
      backgroundColor: '#F8F8F8',
      opacity: 1,
    };
  } else {
    return {
      backgroundColor: 'transparent',
      opacity: 0.3,
    };
  }
};

const openStates = {};
export const NavigatorItemTop = ({ id, router, items, onClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [, forceUpdate] = useState({});
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
        <ListItemText sx={{ '>span': { fontWeight: 'bold' } }}>{id}</ListItemText>
        {items && items.length > 0 && (
          <IconButton>{openStates[id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}</IconButton>
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
                marginLeft: '10px',
                marginTop: '4px',
                fontSize: '15px',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 'bold',
                ...getStyleAttributes(currentPath, router),
                '&:hover': {
                  backgroundColor: '#F8F8F8',
                  cursor: 'pointer',
                },
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
