import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { TextField, IconButton, InputAdornment, Box, Typography, CircularProgress } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const EditableText = ({ style = null, initialValue = '', placeHolder = '', onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [lastSavedValue, setLastSavedValue] = useState(initialValue);
  const [width, setWidth] = useState('auto');
  const [isSaving, setIsSaving] = useState(false);
  const textRef = useRef(null);
  const inputRef = useRef(null);
  const iconRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));

  useEffect(() => {
    setValue(initialValue);
    setLastSavedValue(initialValue);
  }, [initialValue]);

  useLayoutEffect(() => {
    const updateWidth = () => {
      if (inputRef.current && !isEditing) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const computedStyle = window.getComputedStyle(inputRef.current);
        ctx.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
        const letterSpacing = parseFloat(computedStyle.letterSpacing) || 0;
        const textWidth = ctx.measureText(value).width + letterSpacing * (value.length - 1);
        const iconWidth = iconRef?.current?.offsetWidth || 0;
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const newWidth = Math.ceil(textWidth + iconWidth + paddingLeft + paddingRight + 8);
        setWidth(newWidth);
      }
    };
    updateWidth();
  }, [value, isEditing, style]);

  const handleEdit = () => {
    setIsEditing(true);
    setWidth(Math.max(width, 200));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue(initialValue);
  };

  const handleSave = () => {
    if (!value) {
      return;
    }
    if (value === lastSavedValue) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    onSave(value, (saveSuccessful) => {
      setIsSaving(false);
      if (saveSuccessful) {
        setValue(value);
        setLastSavedValue(value);
      } else {
        setValue(lastSavedValue);
      }
      setIsEditing(false);
    });
  };

  const commonInputStyle = {
    fontSize: style?.fontSize || 'inherit',
    fontWeight: style?.fontWeight || 'inherit',
    lineHeight: style?.lineHeight || 'inherit',
    fontFamily: style?.fontFamily || 'inherit',
  };

  return (
    <Box width={width} sx={{ display: 'inline-block', maxWidth: '100%' }}>
      {/* 添加这些样式 */}
      <TextField
        inputRef={inputRef}
        value={value}
        placeholder={placeHolder}
        onChange={(e) => setValue(e.target.value)}
        size="small"
        disabled={!isEditing}
        fullWidth
        InputProps={
          onSave && {
            endAdornment: (
              <InputAdornment position="end" sx={{ ml: '0px', mr: '2px' }} ref={iconRef}>
                {isEditing ? (
                  <>
                    <IconButton size="small" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <CircularProgress size={20} color="primary" />
                      ) : (
                        <CheckIcon fontSize="small" color="primary" />
                      )}
                    </IconButton>
                    <IconButton size="small" onClick={handleCancel} disabled={isSaving}>
                      <CloseIcon fontSize="small" color="error" />
                    </IconButton>
                  </>
                ) : (
                  <EditRoundedIcon fontSize="inherit" sx={{ color: 'primary.main', fontSize: '14px' }} />
                )}
              </InputAdornment>
            ),
            style: {
              backgroundColor: 'transparent',
              paddingRight: '0px',
              ...commonInputStyle,
            },
          }
        }
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderRadius: '0',
              borderColor: isEditing ? '#28aeb1' : 'transparent',
              borderWidth: isEditing ? '1px' : '0',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
            },
            '&:hover fieldset': {
              borderColor: isEditing ? '#28aeb1' : 'transparent',
              borderWidth: isEditing ? '1px' : '0',
            },
          },
          '& .MuiInputBase-input.Mui-disabled': {
            WebkitTextFillColor: style?.color || 'rgba(0, 0, 0, 0.87)',
            color: style?.color || 'rgba(0, 0, 0, 0.87)',
            cursor: 'pointer',
          },
          '& .MuiInputBase-input': {
            cursor: isEditing ? 'text' : 'pointer',
            padding: '8px',
            paddingLeft: 0,
            paddingRight: 0,
            display: 'flex',
            alignItems: 'center',
            ...style,
            color: isEditing ? style?.color : style?.color || 'rgba(0, 0, 0, 0.87)',
            '&::placeholder': {
              color: 'rgba(0, 0, 0, 0.38)', // 设置为灰色
              opacity: 1, // 确保 placeholder 可见
            },
          },
        }}
        onClick={() => !isEditing && handleEdit()}
      />
      <Typography
        ref={textRef}
        sx={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'pre',
          ...commonInputStyle,
          ...style,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default EditableText;
