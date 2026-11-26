import React, { useState } from 'react';
import GetAppIcon from '@mui/icons-material/GetApp';
import LoadingButton from '@mui/lab/LoadingButton';
import {
  Box,
  Button,
  Card,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { downloadCsv, fetchRepairData, initialRepairTableData, yamatoHeaders } from './CsUtils';

const RepairTable = ({ tableData }) => {
  const { t } = useTranslation();
  return (
    <TableContainer>
      <Table size="small">
        <TableHead
          sx={{
            backgroundColor: 'action.disabledBackground',
            '& .MuiTableCell-root': { color: 'action.disabled' },
          }}
        >
          <TableRow>
            <TableCell>{t('cs.repair.columns.ticketNo')}</TableCell>
            <TableCell>{t('cs.repair.columns.phone')}</TableCell>
            <TableCell>{t('cs.repair.columns.zip')}</TableCell>
            <TableCell>{t('cs.repair.columns.address')}</TableCell>
            <TableCell>{t('cs.repair.columns.building')}</TableCell>
            <TableCell>{t('cs.repair.columns.recipient')}</TableCell>
            <TableCell>{t('cs.repair.columns.items')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tableData.ticket !== '' && (
            <TableRow key={tableData.ticket}>
              <TableCell
                component={Link}
                href={`https://candyhouseinc.freshdesk.com/a/tickets/${tableData.ticket}`}
                target="_blank"
                sx={{ color: 'primary.main' }}
              >
                {tableData.ticket}
              </TableCell>
              <TableCell>{tableData.mobile}</TableCell>
              <TableCell>{tableData.zip}</TableCell>
              <TableCell>{tableData.address}</TableCell>
              <TableCell>{tableData.addressDetail}</TableCell>
              <TableCell>{tableData.name}</TableCell>
              <TableCell>
                {tableData.ticket}:{tableData.products}
                {tableData.otherProducts}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const RepairCsv = ({ gManageEmployee, setSnackbarValue }) => {
  const { t } = useTranslation();
  const [ticket, setTicket] = useState('');
  const [csvData, setCsvData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState(initialRepairTableData);

  const handleCreateRepairCsv = async () => {
    if (!ticket || loading) return;
    setLoading(true);
    gManageEmployee.getRepairAuthKey(async (res) => {
      if (res?.success === false) {
        setLoading(false);
        setSnackbarValue?.({
          logScope: 'components/cs/RepairCsv.handleCreateRepairCsv',
          severity: 'error',
          open: true,
          msg: res.message,
        });
        return;
      }
      try {
        const { authorizationKey = null } = res.data || {};
        const { row, tableData: nextTableData } = await fetchRepairData(ticket, authorizationKey);
        setCsvData([row]);
        setTableData(nextTableData);
      } catch (error) {
        setSnackbarValue?.({
          logScope: 'components/cs/RepairCsv.handleCreateRepairCsv',
          severity: 'error',
          open: true,
          msg: String(error?.message ?? error),
        });
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TextField
            label={t('cs.repair.ticketLabel')}
            size="small"
            variant="filled"
            value={ticket}
            onChange={(e) => setTicket(e.target.value.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateRepairCsv();
            }}
            sx={{
              '& .MuiFilledInput-root': {
                height: '40px',
              },
            }}
          />
          <LoadingButton
            variant="contained"
            disabled={!ticket || loading}
            loading={loading}
            onClick={handleCreateRepairCsv}
            sx={{ color: 'white', height: '40px' }}
          >
            {t('cs.search')}
          </LoadingButton>
        </Box>
        <RepairTable tableData={tableData} />
        {csvData.length > 0 && ticket && (
          <Button
            sx={{ mt: 2 }}
            startIcon={<GetAppIcon />}
            onClick={() => downloadCsv(csvData, `${ticket}.csv`, yamatoHeaders)}
          >
            {t('cs.repair.download')}
          </Button>
        )}
      </Card>
    </Box>
  );
};

export default RepairCsv;
