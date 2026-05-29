import React, { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import { Box, Button, Dialog, Divider, Link, List, ListItem, TextField, Typography } from '@mui/material';

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

const CSUserSearchDialog = ({ open, gManageEmployee, gAuth, setSnackbarValue, onClose }) => {
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [rowDatas, setRowDatas] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState('');

  useEffect(() => {
    if (!open) {
      setKeyword('');
      setSearching(false);
      setConfirming(false);
      setRowDatas(null);
      setSelectedEmail('');
    }
  }, [open]);

  const resultItems = useMemo(() => {
    return Array.isArray(rowDatas) ? rowDatas : [];
  }, [rowDatas]);

  const isValidKeyword = useMemo(() => {
    return keyword.trim().length > 0;
  }, [keyword]);

  useEffect(() => {
    if (keyword.trim().length === 0) {
      setKeyword('');
      setSearching(false);
      setConfirming(false);
      setRowDatas(null);
      setSelectedEmail('');
    }
  }, [keyword]);

  const handleSearch = () => {
    const keywordStr = keyword.trim();
    if (!keywordStr || searching) return;
    setSearching(true);
    setRowDatas(null);
    setSelectedEmail('');
    gManageEmployee.queryByCS(keywordStr, (res) => {
      setSearching(false);
      if (res?.success === false) {
        setSnackbarValue({ open: true, msg: res.message });
        return;
      }
      setRowDatas(res.data);
    });
  };

  const handleCopyAndConfirm = async () => {
    if (!selectedEmail) return;
    setConfirming(true);
    await navigator.clipboard.writeText(selectedEmail);
    gManageEmployee.confirmQueryByCS(selectedEmail, (res) => {
      setConfirming(false);
      setSnackbarValue({ open: true, msg: res.message });
      if (res?.success === false) return;
      onClose && onClose();
      gAuth.handleSignout();
    });
  };

  const isUserRow = (type) => String(type).toLowerCase() === 'user';

  const renderResultItem = (result) => {
    const text = getItemText(result.item);
    const email = isUserRow(result.type) ? getUserItemEmail(result.item) : '';
    if (!email) {
      return (
        <Typography variant="body2" sx={{ color: 'info.main', wordBreak: 'break-all' }}>
          {renderHighlightedText(text, keyword)}
        </Typography>
      );
    }

    const emailIndex = text.indexOf(email);
    if (emailIndex < 0) {
      return (
        <Typography variant="body2" sx={{ color: 'info.main', wordBreak: 'break-all' }}>
          {renderHighlightedText(text, keyword)}
        </Typography>
      );
    }

    const beforeEmail = text.slice(0, emailIndex);
    const afterEmail = text.slice(emailIndex + email.length);

    return (
      <Typography component="span" variant="body2" sx={{ color: 'info.main', wordBreak: 'break-all' }}>
        {renderHighlightedText(beforeEmail, keyword)}
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
          onClick={() => setSelectedEmail(email)}
        >
          {renderHighlightedText(email, keyword)}
        </Link>
        {renderHighlightedText(afterEmail, keyword)}
      </Typography>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          p: 2,
          borderRadius: '5px',
          width: '80vw',
          maxWidth: 960,
          m: { xs: 2, sm: 4 },
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: { xs: 'min(70vh, 420px)', sm: 420 },
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
          {rowDatas && resultItems.length === 0 && (
            <Typography variant="body2" sx={{ color: 'info.light' }}>
              No information found
            </Typography>
          )}
          {resultItems.length > 0 && (
            <List disablePadding>
              {resultItems.map((result, index) => (
                <React.Fragment key={`${result.type}-${index}`}>
                  <ListItem sx={{ px: 0, py: 1, alignItems: 'flex-start' }}>{renderResultItem(result)}</ListItem>
                  <Divider sx={{ opacity: 0.4 }} />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {selectedEmail && (
          <Button
            fullWidth
            variant="contained"
            onClick={handleCopyAndConfirm}
            disabled={confirming}
            sx={{ mt: 2, color: 'white' }}
          >
            {`Copy "${selectedEmail}" -> Login`}
          </Button>
        )}
      </Box>
    </Dialog>
  );
};

export default CSUserSearchDialog;
