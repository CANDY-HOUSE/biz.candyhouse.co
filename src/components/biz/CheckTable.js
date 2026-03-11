import React, { useMemo, useState } from 'react';
import MUIDataTable from 'mui-datatables';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Button, Box, Typography } from '@mui/material';
import { Wifi } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

const CheckTable = ({
  title,
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
      label: 'デバイス名',
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
          title={<Typography variant="h2">{title}</Typography>}
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
              pagination: {
                next: 'Next Page',
                previous: 'Previous Page',
                rowsPerPage: '表示数',
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
            キャンセル
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
              確認
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
              確認
            </Button>
          )}
        </Box>
      </ThemeProvider>
    </Box>
  );
};

export default CheckTable;
