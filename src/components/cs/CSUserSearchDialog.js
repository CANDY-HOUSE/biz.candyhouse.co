import React, { useEffect, useMemo, useState } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import LoadingButton from '@mui/lab/LoadingButton';
import {
  Box,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItem,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';

const getItemText = (item) => {
  if (typeof item === 'string') return item;
  if (item === undefined || item === null) return '';
  try {
    return JSON.stringify(item);
  } catch {
    return String(item);
  }
};

const getUserItemEmail = (item) => {
  if (item && typeof item === 'object' && typeof item.email === 'string') {
    return item.email;
  }

  const text = getItemText(item);
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.email === 'string') {
      return parsed.email;
    }
  } catch {
    // Fall back to matching text formats like email: foo@example.com.
  }

  return text.match(/["']?email["']?\s*[:=]\s*["']?([^"',}\s]+@[^"',}\s]+)/)?.[1] ?? '';
};

const renderHighlightedText = (text, keyword) => {
  const target = keyword.trim();
  if (!target) return text;

  const parts = [];
  const lowerText = text.toLowerCase();
  const lowerTarget = target.toLowerCase();
  let cursor = 0;
  let matchIndex = lowerText.indexOf(lowerTarget, cursor);

  while (matchIndex >= 0) {
    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }
    parts.push(
      <Box
        key={`${matchIndex}-${parts.length}`}
        component="mark"
        sx={{ bgcolor: 'rgba(25, 118, 210, 0.18)', color: 'inherit', px: '2px', borderRadius: '2px' }}
      >
        {text.slice(matchIndex, matchIndex + target.length)}
      </Box>
    );
    cursor = matchIndex + target.length;
    matchIndex = lowerText.indexOf(lowerTarget, cursor);
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
};

const initialSearchState = {
  searching: false,
  rowDatas: null,
  totalCount: null,
};

const CSUserSearchDialog = ({ open, gManageEmployee, setSnackbarValue }) => {
  const [keyword, setKeyword] = useState('');
  const [resultKeyword, setResultKeyword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [searchState, setSearchState] = useState(initialSearchState);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [emailMenuAnchor, setEmailMenuAnchor] = useState(null);
  const { searching, rowDatas, totalCount } = searchState;

  useEffect(() => {
    if (!open) {
      setKeyword('');
      setResultKeyword('');
      setConfirming(false);
      setSearchState(initialSearchState);
      setSelectedEmail('');
      setEmailMenuAnchor(null);
    }
  }, [open]);

  const resultItems = useMemo(() => {
    return Array.isArray(rowDatas) ? rowDatas : [];
  }, [rowDatas]);

  const isValidKeyword = useMemo(() => {
    return keyword.trim().length >= 3;
  }, [keyword]);

  useEffect(() => {
    if (keyword.trim().length === 0) {
      setKeyword('');
      setResultKeyword('');
      setConfirming(false);
      setSearchState(initialSearchState);
      setSelectedEmail('');
      setEmailMenuAnchor(null);
    }
  }, [keyword]);

  const handleSearch = () => {
    const keywordStr = keyword.trim();
    if (!keywordStr || searching) return;
    setResultKeyword('');
    setSearchState({
      searching: true,
      rowDatas: null,
      totalCount: null,
    });
    setSelectedEmail('');
    gManageEmployee.queryByCS(keywordStr, (res) => {
      if (res?.success === false) {
        setSearchState((prevState) => ({ ...prevState, searching: false }));
        setSnackbarValue({ open: true, msg: res.message });
        return;
      }
      setSearchState({
        searching: !res.done,
        rowDatas: res.data,
        totalCount: res.totalCount ?? res.data?.length ?? 0,
      });
    });
  };

  const handleCloseEmailMenu = () => {
    setSelectedEmail('');
    setEmailMenuAnchor(null);
  };

  const handleCopyAndConfirm = async () => {
    if (!selectedEmail) return;
    setConfirming(true);
    // Safari 弹窗与剪贴板都要求在用户手势的同步阶段触发：
    navigator.clipboard.writeText(selectedEmail).catch(() => {});
    const loginWindow = window.open('', '_blank');
    gManageEmployee.confirmQueryByCS(selectedEmail, async (res) => {
      setConfirming(false);
      setSnackbarValue({ open: true, msg: res.message });
      let { loginUrl = null } = res?.success === false ? {} : res.data || {};
      if (loginUrl && loginWindow) {
        loginWindow.location.href = loginUrl;
      } else if (loginWindow) {
        loginWindow.close();
      }
    });
  };

  const isUserRow = (type) => String(type).toLowerCase() === 'user';

  const filteredResultItems = useMemo(() => {
    const target = resultKeyword.trim().toLowerCase();
    if (!target) return resultItems;
    return resultItems.filter((result) => getItemText(result.item).toLowerCase().includes(target));
  }, [resultItems, resultKeyword]);

  const renderResultItem = (result) => {
    const text = getItemText(result.item);
    const email = isUserRow(result.type) ? getUserItemEmail(result.item) : '';
    const highlightKeyword = resultKeyword.trim() || keyword;
    if (!email) {
      return (
        <Typography variant="body2" sx={{ color: 'info.main', wordBreak: 'break-all' }}>
          {renderHighlightedText(text, highlightKeyword)}
        </Typography>
      );
    }

    const emailIndex = text.indexOf(email);
    if (emailIndex < 0) {
      return (
        <Typography variant="body2" sx={{ color: 'info.main', wordBreak: 'break-all' }}>
          {renderHighlightedText(text, highlightKeyword)}
        </Typography>
      );
    }

    const beforeEmail = text.slice(0, emailIndex);
    const afterEmail = text.slice(emailIndex + email.length);

    return (
      <Typography component="span" variant="body2" sx={{ color: 'info.main', wordBreak: 'break-all' }}>
        {renderHighlightedText(beforeEmail, highlightKeyword)}
        <Link
          component="button"
          variant="body2"
          sx={{
            color: 'inherit',
            textDecoration: 'underline',
            verticalAlign: 'baseline',
            wordBreak: 'break-all',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
          onClick={(event) => {
            setSelectedEmail(email);
            setEmailMenuAnchor(event.currentTarget);
          }}
        >
          {renderHighlightedText(email, highlightKeyword)}
        </Link>
        {renderHighlightedText(afterEmail, highlightKeyword)}
      </Typography>
    );
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: 'stretch' }}>
        <TextField
          fullWidth
          size="small"
          value={keyword}
          placeholder="email subUUID deviceUUID deviceName"
          variant="filled"
          sx={{
            '& .MuiFilledInput-root': {
              height: '40px',
            },
            '& .MuiFilledInput-input': {
              py: 0,
            },
          }}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !searching) {
              handleSearch();
            }
          }}
          InputProps={{
            endAdornment: keyword && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setKeyword('')} edge="end">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <LoadingButton
          variant="contained"
          onClick={handleSearch}
          disabled={!isValidKeyword || searching}
          loading={searching}
          sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0, height: '40px', color: 'white' }}
        >
          Search
        </LoadingButton>
      </Box>

      <Box sx={{ mt: 2, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {rowDatas && filteredResultItems.length === 0 && (
          <Typography variant="body2" sx={{ color: 'info.light' }}>
            No information found
          </Typography>
        )}
        {filteredResultItems.length > 0 && (
          <List disablePadding>
            {filteredResultItems.map((result, index) => (
              <React.Fragment key={`${result.type}-${index}`}>
                <ListItem sx={{ px: 0, py: 1, alignItems: 'flex-start' }}>{renderResultItem(result)}</ListItem>
                <Divider sx={{ opacity: 0.4 }} />
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <TextField
          size="small"
          value={resultKeyword}
          placeholder="Search in results"
          variant="filled"
          sx={{
            width: { xs: '60%', sm: 240 },
            '& .MuiFilledInput-root': {
              height: '32px',
            },
            '& .MuiFilledInput-input': {
              py: 0,
              fontSize: '12px',
            },
          }}
          onChange={(e) => setResultKeyword(e.target.value)}
          InputProps={{
            endAdornment: resultKeyword && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setResultKeyword('')} edge="end">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Typography variant="caption" sx={{ color: 'info.light' }}>
          {`Showing ${resultItems.length} / Total ${totalCount ?? 0}`}
        </Typography>
      </Box>

      <Menu
        anchorEl={emailMenuAnchor}
        open={Boolean(emailMenuAnchor)}
        onClose={handleCloseEmailMenu}
        MenuListProps={{ sx: { py: 0 } }}
        PaperProps={{ sx: { py: 0 } }}
      >
        <MenuItem
          onClick={handleCopyAndConfirm}
          disabled={confirming}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&.Mui-disabled': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
          }}
        >
          {`Copy and Login`}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CSUserSearchDialog;
