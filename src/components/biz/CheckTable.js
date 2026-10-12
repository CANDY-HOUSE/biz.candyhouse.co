import { useTranslation } from 'react-i18next';
import theme from '@/theme/theme';
import React, { useMemo, useState } from 'react';
import MUIDataTable from 'mui-datatables';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Button, Box, Typography } from '@mui/material';
import { Wifi } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

const CheckTable = ({
  title,
  titleKey,
  data,
  loadingAble,
  setOpenModal,
  handleCheck,
  isWifi = false,
  selectableRows = 'multiple', // 改为更明确的值
  enableFilter = false,
  enableFilterType = 'textField',
  useCustomSelection = false,
  customColumns = [],
  isMobile = false,
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const ndata = useMemo(() => {
    return isWifi ? data.map((obj) => ({ ...obj, wifiState: obj.stateInfo.wm2State })) : data;
  }, [data, isWifi]);

  const getMuiTheme = () =>
    createTheme({
      palette: {
        primary: {
          main: '#28aeb1',
        },
        info: {
          light: '#cccccc',
          main: '#666666',
        },
        error: {
          light: '#db807c',
          main: '#CC4A44',
        },
      },
      typography: {
        fontFamily: "'Noto Sans JP', sans-serif",
        h2: {
          fontSize: '22px',
          fontWeight: 'bold',
        },
        h4: {
          fontSize: '16px',
        },
        h5: {
          fontSize: '14px',
        },
        button: {
          textTransform: 'none',
        },
      },
      components: {
        MuiCircularProgress: theme.components.MuiCircularProgress,
        MuiTypography: {
          styleOverrides: {
            root: {
              letterSpacing: '0.02rem',
            },
          },
        },
        MUIDataTableBodyRow: {
          styleOverrides: {
            root: {
              '&.Mui-selected': {
                backgroundColor: 'transparent !important',
                '&:hover': {
                  backgroundColor: 'transparent !important',
                },
              },
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderBottom: 'none',
              ...(isMobile && {
                padding: '0px',
                fontSize: '0.8rem',
                maxWidth: '280px',
                wordWrap: 'break-word',
                wordBreak: 'break-all',
                whiteSpace: 'normal',
              }),
            },
          },
        },
        MuiTableHead: {
          styleOverrides: {
            root: {
              ...(isMobile && {
                display: 'none',
              }),
            },
          },
        },
        MUIDataTableSelectCell: {
          styleOverrides: {
            root: {
              ...(isMobile && {
                paddingLeft: 0,
                paddingRight: 0,
              }),
            },
          },
        },
        MUIDataTablePagination: {
          styleOverrides: {
            root: {
              '& .MuiTablePagination-toolbar': {
                padding: '0px',
              },
              '& .css-1k4xkk7-MuiTableCell-root': {
                padding: '0px',
              },
            },
            tableCellContainer: {
              padding: '0px',
            },
          },
        },
        MUIDataTableToolbar: {
          styleOverrides: {
            root: {
              ...(isMobile && {
                paddingLeft: 0,
                paddingRight: 0,
              }),
            },
          },
        },
      },
      MUIDataTableBodyCell: {
        styleOverrides: {
          root: {
            // backgroundColor: 'yellow',
          },
        },
      },
    });

  const deviceColumns = [
    {
      name: 'deviceName',
      label: t('contacts.deviceName'),
      options: {
        customBodyRenderLite: (dataIndex) => {
          const rowData = ndata[dataIndex];
          if (isWifi) {
            return (
              <Box sx={{ display: 'flex' }}>
                <Typography sx={{ mr: '10px' }}>{rowData.deviceName}</Typography>
                <Wifi
                  style={{
                    color: rowData.wifiState ? '#28aeb1' : '#999',
                  }}
                />
              </Box>
            );
          } else {
            return <Typography>{rowData.deviceName}</Typography>;
          }
        },
      },
    },
  ];

  return (
    <Box>
      <ThemeProvider theme={getMuiTheme()}>
        <MUIDataTable
          title={<Typography variant="h2">{titleKey ? t(titleKey) : title}</Typography>}
          columns={customColumns.length > 0 ? customColumns : deviceColumns}
          data={ndata}
          options={{
            setRowProps: (row, dataIndex, _rowIndex) => {
              return {
                key: row.deviceUUID || dataIndex, // 假设 deviceUUID 是唯一的
              };
            },
            isRowSelectable: (dataIndex, _selectedRows) => {
              // 在全體卡片才要有認證機器的WiFi顯示
              if (isWifi) {
                const row = ndata[dataIndex];
                return typeof row.wifiState === 'string' ? row.wifiState === 'true' : row.wifiState;
              } else {
                return true;
              }
            },
            count: ndata.length,
            onTableChange: (action, tableState) => {
              console.log('数据变化了', action, tableState);
            },
            selectToolbarPlacement: 'none',
            responsive: 'standard',
            filter: enableFilter,
            filterType: enableFilterType,
            search: false,
            print: false,
            download: false,
            viewColumns: false,
            customToolbar: null,
            pagination: true,
            rowsPerPage: 10,
            rowsPerPageOptions: [5, 8, 10],
            elevation: 0,
            selectableRows: selectableRows,
            onRowSelectionChange: (currentRowsSelected, allSelected, rowsSelected) => {
              if (useCustomSelection) {
                // 客製化
                setSelected(rowsSelected.map((index) => ndata[index]));
              } else {
                // 預設
                setSelected(allSelected?.map(({ index }) => ndata[index]));
              }
            },
            setTableProps: () => {
              return {
                size: 'small',
              };
            },
            tableBodyHeight: '50vh',
            textLabels: {
              body: { noMatch: t('contacts.noResults'), toolTip: t('contacts.sort') },
              toolbar: { filterTable: t('contacts.filter') },
              filter: { all: t('contacts.all'), title: t('contacts.filter'), reset: t('contacts.reset') },
              pagination: {
                next: t('contacts.nextPage'),
                previous: t('contacts.previousPage'),
                rowsPerPage: t('contacts.rowsPerPage'),
                displayRows: '/',
              },
            },
          }}
        />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            mt: '10px',
          }}
        >
          <Button
            size="small"
            sx={{ mr: '10px' }}
            onClick={() => {
              setOpenModal(false);
            }}
          >
            {t('deviceMember.opt.cancel')}
          </Button>
          {loadingAble ? (
            <LoadingButton
              loading={loading}
              disabled={selected.length === 0}
              disableElevation
              size="small"
              variant="outlined"
              onClick={() => {
                setLoading(true);
                handleCheck(selected, (_res) => {
                  setLoading(false);
                });
              }}
            >
              {t('deviceMember.opt.ok')}
            </LoadingButton>
          ) : (
            <Button
              disabled={selected.length === 0}
              disableElevation
              size="small"
              variant="outlined"
              onClick={() => {
                handleCheck(selected);
              }}
            >
              {t('deviceMember.opt.ok')}
            </Button>
          )}
        </Box>
      </ThemeProvider>
    </Box>
  );
};

export default CheckTable;
