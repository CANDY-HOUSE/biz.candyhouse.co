import { logOperationFailure } from '@/services/operationFailure';
import React, { useState } from 'react';
import { Divider, IconButton, ListSubheader, Menu, MenuItem, Tooltip } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { downloadCredentials } from '@/utils/credentialExport';
import { useTranslation } from 'react-i18next';

const formats = ['csv', 'excel', 'json'];

export default function CredentialExportMenu({ data, type, onExportAll, isExporting = false }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const { t } = useTranslation();

  const handleExport = async (format, all = false) => {
    setAnchorEl(null);
    try {
      if (all) {
        await onExportAll(format);
      } else {
        downloadCredentials(data, type, format);
      }
    } catch {
      logOperationFailure('CredentialExportMenu.export');
    }
  };

  return (
    <>
      <Tooltip title={t('csv.export.tooltip')}>
        <span>
          <IconButton
            aria-label={t('csv.export.tooltip')}
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
        {onExportAll && <ListSubheader>{t('csv.export.currentData')}</ListSubheader>}
        {formats.map((format) => (
          <MenuItem key={format} disabled={isExporting} onClick={() => handleExport(format)}>
            {format === 'excel' ? 'Excel' : format.toUpperCase()}
          </MenuItem>
        ))}
        {onExportAll && <Divider />}
        {onExportAll && <ListSubheader>{t('csv.export.allUsedCards')}</ListSubheader>}
        {onExportAll &&
          formats.map((format) => (
            <MenuItem key={`all-${format}`} disabled={isExporting} onClick={() => handleExport(format, true)}>
              {format === 'excel' ? 'Excel' : format.toUpperCase()}
            </MenuItem>
          ))}
      </Menu>
    </>
  );
}
