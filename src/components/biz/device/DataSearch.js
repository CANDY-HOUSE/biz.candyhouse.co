import { Box, IconButton, TextField } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import React, { useRef, useEffect } from 'react';
import { debounce } from 'lodash';

export const DataSearch = ({ callSearch, initialValue = '' }) => {
  const [search, setSearch] = React.useState(initialValue);

  const callSearchRef = useRef(callSearch);
  useEffect(() => {
    callSearchRef.current = callSearch;
  }, [callSearch]);

  const debouncedSearchRef = useRef(
    debounce((value) => {
      if (callSearchRef.current) callSearchRef.current(value);
    }, 500)
  );

  useEffect(() => {
    if (initialValue !== search) {
      setSearch(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
        background: '#FAFAFA',
        borderRadius: '32px',
        height: '40px',
      }}
    >
      <SearchIcon sx={{ color: 'action.active', ml: 2, mr: 1, mt: 0.5 }} />
      <TextField
        variant="standard"
        placeholder="検索"
        value={search}
        sx={{
          width: '100%',
          '& .MuiInputBase-root': {
            paddingRight: '40px',
          },
        }}
        InputProps={{
          disableUnderline: true,
          style: { border: 'none', flexGrow: 1 },
        }}
        onChange={(e) => {
          setSearch(e.target.value);
          debouncedSearchRef.current(e.target.value);
        }}
      />

      {search && (
        <IconButton
          aria-label="clear search"
          onClick={() => {
            setSearch('');
            debouncedSearchRef.current.cancel(); // 取消待处理的防抖调用
            if (callSearchRef.current) callSearchRef.current(''); // 使用 ref 中的最新函数
          }}
          size="small"
          sx={{
            position: 'absolute',
            right: '20px', // 已修改为20px
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '4px',
          }}
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};
