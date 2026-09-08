import React, { useState } from 'react';
import { Alert, Divider, IconButton, ListSubheader, Menu, MenuItem, Snackbar, Tooltip } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { downloadCredentials } from '@/utils/credentialExport';

const formats = ['csv', 'excel', 'json'];

export default function CredentialExportMenu({ data, type, onExportAll, isExporting = false }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [hasError, setHasError] = useState(false);

  const handleExport = async (format, all = false) => {
    setAnchorEl(null);
    try {
      if (all) {
        await onExportAll(format);
      } else {
        downloadCredentials(data, type, format);
      }
    } catch {
      setHasError(true);
    }
  };

  return (
    <>
      <Tooltip title="データをエクスポート">
        <span>
          <IconButton
            aria-label="データをエクスポート"
            aria-haspopup="menu"
            aria-expanded={Boolean(anchorEl)}
            disabled={isExporting}
            onClick={(event) => {
              event.stopPropagation();
              setAnchorEl(event.currentTarget);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={(event) => event.stopPropagation()}
          >
            <CloudDownloadIcon fontSize="small" sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        onClick={(event) => event.stopPropagation()}
      >
        {onExportAll && <ListSubheader>現在のデータ</ListSubheader>}
        {formats.map((format) => (
          <MenuItem key={format} disabled={isExporting} onClick={() => handleExport(format)}>
            {format === 'excel' ? 'Excel' : format.toUpperCase()}
          </MenuItem>
        ))}
        {onExportAll && <Divider />}
        {onExportAll && <ListSubheader>過去に使用した全カード</ListSubheader>}
        {onExportAll &&
          formats.map((format) => (
            <MenuItem key={`all-${format}`} disabled={isExporting} onClick={() => handleExport(format, true)}>
              {format === 'excel' ? 'Excel' : format.toUpperCase()}
            </MenuItem>
          ))}
      </Menu>
      <Snackbar open={hasError} autoHideDuration={6000} onClose={() => setHasError(false)}>
        <Alert severity="error" onClose={() => setHasError(false)}>
          エクスポートに失敗しました。データをご確認のうえ、再度お試しください。
        </Alert>
      </Snackbar>
    </>
  );
}
