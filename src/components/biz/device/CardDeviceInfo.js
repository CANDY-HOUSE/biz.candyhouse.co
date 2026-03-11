import React, { useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditableText from '../../EditableText';
import EditIcon from '@mui/icons-material/Edit';

const InfoItem = ({ label, value, onEdit, onDelete, onAdd, isMobile }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const handleDeleteClick = (event, index) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setDeleteIndex(index);
  };

  const handleDeleteClose = () => {
    setAnchorEl(null);
  };

  const handleConfirmDelete = () => {
    onDelete(label, deleteIndex);
    handleDeleteClose();
  };

  if (typeof value === 'string') {
    if (isMobile) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
          <Typography sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>{label}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ color: '##333' }}>{value}</Typography>
            {onEdit && (
              <IconButton size="small" color="primary" onClick={() => onEdit(label, value)}>
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ width: 120, fontWeight: 'bold', color: '#333' }}>{label}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: '##333' }}>{value}</Typography>
          {onEdit && (
            <IconButton size="small" color="primary" onClick={() => onEdit(label, value)}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
    );
  }

  if (Array.isArray(value)) {
    if (isMobile) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', mb: 2 }}>
          <Typography sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>{label}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
            {value.map((item, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    mb: 1,
                  }}
                >
                  <Typography
                    sx={{
                      color: '#888',
                      flexBasis: '30%',
                      flexShrink: 0,
                    }}
                  >
                    {item.title}
                  </Typography>

                  <Box
                    sx={{
                      flexGrow: 1,
                      flexBasis: '50%',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <EditableText
                      initialValue={item.value}
                      onSave={(newValue, callback) => onEdit(label, newValue, index, callback)}
                    />
                  </Box>

                  {value.length > 1 && onDelete && (
                    <Box
                      sx={{
                        flexBasis: '20%',
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <IconButton size="small" color="error" onClick={(e) => handleDeleteClick(e, index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
            <Box sx={{ padding: 0 }}>
              <IconButton disabled={!onAdd} size="small" onClick={() => onAdd(label)}>
                <AddCircleIcon style={{ color: '#28AEB1' }} />
              </IconButton>
            </Box>
          </Box>

          {/* 删除确认菜单 */}
          <Menu
            elevation={1}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            MenuListProps={{ disablePadding: true }}
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleDeleteClose}
          >
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmDelete();
              }}
            >
              削除
            </MenuItem>
          </Menu>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', width: '100%' }}>
        <Typography sx={{ width: 120, fontWeight: 'bold', color: '#333', pt: 1 }}>{label}</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {value.map((item, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: '200px 1fr', width: '100%' }}>
                <Typography sx={{ color: '#888', pt: 1 }}>{item.title}</Typography>
                <EditableText
                  initialValue={item.value}
                  onSave={(newValue, callback) => onEdit(label, newValue, index, callback)}
                />
              </Box>
              {value.length > 1 && (
                <Box sx={{ position: 'absolute', left: 'calc(60%)' }}>
                  {onDelete && (
                    <IconButton size="small" color="error" onClick={(e) => handleDeleteClick(e, index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              )}
            </Box>
          ))}
          <Box sx={{ padding: 0 }}>
            <IconButton disabled={!onAdd} size="small" onClick={() => onAdd(label)}>
              <AddCircleIcon style={{ color: '#28AEB1' }} />
            </IconButton>
          </Box>

          {/* 删除确认菜单 */}
          <Menu
            elevation={1}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            MenuListProps={{ disablePadding: true }}
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleDeleteClose}
          >
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmDelete();
              }}
            >
              削除
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    );
  }

  return null;
};

const CardInfoDisplay = ({ style, data, onEdit, onDelete, onAdd, isMobile }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        width: '100%',
        mt: '20px',
        pl: isMobile ? '15px' : '25px',
        pr: isMobile ? '15px' : 0,
        ...style,
      }}
    >
      {Object.entries(data).map(([key, value], index) => (
        <InfoItem
          key={index}
          label={key}
          value={value}
          onEdit={onEdit}
          onDelete={onDelete}
          onAdd={onAdd}
          isMobile={isMobile}
        />
      ))}
    </Box>
  );
};

export default CardInfoDisplay;
