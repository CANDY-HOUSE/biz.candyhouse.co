import { createTheme, ThemeProvider } from '@mui/material/styles';
import MUIDataTable from 'mui-datatables';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import LinkIcon from '@mui/icons-material/Link';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { gUtils } from '@/utils/gUtils';
import KeyIcon from '@mui/icons-material/Key';
import SimCardDownloadIcon from '@mui/icons-material/SimCardDownload';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { DataSearch } from './DataSearch';
import TablePagination from '@mui/material/TablePagination';
import { Box, Stack, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';

const CustomPagination = ({
  hasNext,
  count,
  page,
  rowsPerPage,
  onChangePage,
  onChangeRowsPerPage,
  rowsPerPageOptions,
  showCount = false,
  inTableFooter = false,
}) => {
  const isDisable = showCount ? (page + 1) * rowsPerPage >= count : !hasNext;

  if (inTableFooter) {
    return (
      <td colSpan={1000} style={{ padding: 0, border: 'none' }}>
        <TablePagination
          component="div"
          count={count}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions || [50]}
          onPageChange={(_, newPage) => onChangePage(newPage)}
          onRowsPerPageChange={(event) => onChangeRowsPerPage(parseInt(event.target.value, 10))}
          nextIconButtonProps={{ disabled: isDisable }}
          backIconButtonProps={{ disabled: page === 0 }}
          labelRowsPerPage="表示数"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to}${showCount ? '/' + count : ''}`}
        />
      </td>
    );
  }

  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      rowsPerPageOptions={rowsPerPageOptions || [50]}
      onPageChange={(_, newPage) => onChangePage(newPage)}
      onRowsPerPageChange={(event) => onChangeRowsPerPage(parseInt(event.target.value, 10))}
      nextIconButtonProps={{ disabled: isDisable }}
      backIconButtonProps={{ disabled: page === 0 }}
      labelRowsPerPage="表示数"
      labelDisplayedRows={({ from, to, count }) => `${from}-${to}${showCount ? '/' + count : ''}`}
    />
  );
};

export default function DataTable({
  data,
  text,
  columns,
  callRowClick,
  callAdd,
  callBind,
  callDelData,
  callSearch,
  selectableRows = 'multiple',
  isKey = false,
  isDel = true,
  isCsv = true,
  onCsvClick = null,
  toolbarActions = null,
  isBind = true,
  isBack = false,
  isHideToolBar = false,
  adjustToolBar = false,
  btnCallKey,
  rowSelectable = undefined,
  isShowFooter = true,
  rowsPerPageOptions = undefined,
  ref = null,
  refreshTb = 0x23,
  callSelects,
  callRefresh,
  rowHeight = 'default',
  onPageConfChange = null,
  hasNext = false,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [key, setKey] = useState(undefined);
  const [globalSelectedIndices, setGlobalSelectedIndices] = useState(new Set());
  const defaultPageConf = {
    page: 0,
    rowsPerPage: onPageConfChange ? 50 : 100,
  };
  const [pageConf, setPageConf] = useState({ ...defaultPageConf });
  const [sortableData, setSortableData] = useState(data);

  // 当原始数据变化时更新可排序数据
  useEffect(() => {
    setSortableData(data);
    setGlobalSelectedIndices(new Set());
  }, [data]);

  const getRowHeight = () => {
    const presetHeights = {
      small: 20,
      default: 50,
      large: 70,
    };
    if (typeof rowHeight === 'string' && rowHeight in presetHeights) {
      return presetHeights[rowHeight];
    }
    const numericHeight = Number(rowHeight);
    if (!isNaN(numericHeight) && numericHeight > 0) {
      return numericHeight;
    }
    return presetHeights.default;
  };

  const handleMenuOpen = async (event, type) => {
    if (type === 'mobile') {
      await handleDeleteClick(event);
      setAnchorEl(null);
      return;
    }
    setAnchorEl(event.currentTarget);
  };

  useEffect(() => {
    const selectedData = Array.from(globalSelectedIndices)
      .filter((index) => index < sortableData.length)
      .map((index) => sortableData[index])
      .filter(Boolean);
    setSelectedRows(selectedData);
  }, [globalSelectedIndices, sortableData]);

  useEffect(() => {
    if (callSelects) callSelects(selectedRows);
  }, [selectedRows]);

  useEffect(() => {
    setAnchorEl(null);
    setGlobalSelectedIndices(new Set());
    setKey(refreshTb);
    setPageConf({ ...defaultPageConf });
  }, [refreshTb]);

  const handleDeleteClick = async (event) => {
    setAnchorEl(event.currentTarget);
    if (selectedRows.length > 0) {
      try {
        console.log('当前选择selectedRows', selectedRows, callDelData);

        if (callDelData) callDelData(selectedRows);
      } catch (error) {
        // エラーハンドリング
        console.error(error);
      }
    }
  };

  const handleDeleteClose = () => {
    setAnchorEl(null);
  };

  const getMuiTheme = (_len) =>
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
        MuiCheckbox: {
          styleOverrides: {
            root: {
              color: '#BDBDBD',
              '& .MuiSvgIcon-root': {
                fontSize: 25, // 使图标更小，线条看起来更细
              },
            },
          },
        },
        MuiTypography: {
          styleOverrides: {
            root: {
              letterSpacing: '0.02rem',
            },
          },
        },
        MUIDataTableToolbar: {
          styleOverrides: {
            root: {
              minHeight: 'auto',
              height: isHideToolBar ? '0px' : 'auto',
              display: isHideToolBar ? 'none' : 'block',
              marginBottom: adjustToolBar ? '-30px' : '0px',
              padding: '0 10px', // 在这里调整 padding
              paddingRight: '0px',
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              height: `${getRowHeight()}px`,
              maxHeight: `${getRowHeight()}px`,
              border: 'none',
              '&:first-of-type': {
                borderTopLeftRadius: '6px',
                borderBottomLeftRadius: '6px',
              },
              '&:last-of-type': {
                borderTopRightRadius: '6px !important',
                borderBottomRightRadius: '6px !important',
              },
              padding: '0px 16px',
            },
          },
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              '&:hover': {
                cursor: 'pointer',
              },
            },
          },
        },
        MUIDataTableBodyRow: {
          styleOverrides: {
            root: {
              height: `${getRowHeight()}px !important`,
              maxHeight: `${getRowHeight()}px !important`,
              border: 'none',
              overflow: 'hidden', // 防止内容溢出
            },
          },
        },
        MUIDataTableBodyCell: {
          styleOverrides: {
            stackedCommon: {
              '@media (max-width: 899.95px)': {
                fontSize: '12px !important',
              },
            },
          },
        },
      },
    });

  const currentPageData = useMemo(() => {
    const startIndex = pageConf.page * pageConf.rowsPerPage;
    const endIndex = Math.min(startIndex + pageConf.rowsPerPage, sortableData.length);
    return sortableData.slice(startIndex, endIndex);
  }, [pageConf, sortableData]);

  const onChangePage = useCallback(
    (newPage) => {
      const updatedPageConf = {
        ...pageConf,
        page: newPage,
      };
      if (onPageConfChange) {
        onPageConfChange({
          old: pageConf,
          new: updatedPageConf,
          cb: () => {
            setPageConf(updatedPageConf);
          },
        });
      } else {
        setPageConf(updatedPageConf);
      }
    },
    [pageConf, onPageConfChange]
  );

  const onChangeRowsPerPage = useCallback();

  return (
    <Stack
      sx={{
        p: '16px',
        marginTop: adjustToolBar ? '20px' : '0px',
      }}
    >
      <ThemeProvider theme={getMuiTheme(data.length)}>
        <MUIDataTable
          ref={ref}
          key={key ?? 0x888}
          data={currentPageData}
          title={
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexDirection: 'column',
                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: text ? 'space-between' : 'flex-start',
                    width: '100%',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      flexDirection: 'row',
                    }}
                  >
                    {isBack && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          window.history.back();
                        }}
                        sx={{ color: 'rgba(0, 0, 0, 0.87)' }}
                      >
                        <KeyboardArrowLeftIcon />
                      </IconButton>
                    )}

                    {text && (
                      <Typography variant="h2" sx={{ fontWeight: 'bold' }}>
                        {text}
                      </Typography>
                    )}
                  </Box>

                  {callSearch && (
                    <Box sx={{ minWidth: '30%' }}>
                      <DataSearch callSearch={callSearch} />
                    </Box>
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  display:
                    callAdd || isBind || isKey || isCsv || isDel || callSearch || isShowFooter || toolbarActions
                      ? 'flex'
                      : 'none',
                  justifyContent: 'space-between',
                }}
              >
                {isBind || callAdd || isKey || isCsv || isDel || callSearch || toolbarActions ? (
                  <Box
                    sx={{
                      display: 'flex',
                      marginLeft: '2px',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    {callAdd && (
                      <IconButton
                        onClick={() => {
                          if (callAdd) callAdd();
                        }}
                      >
                        <AddCircleIcon fontSize="small" style={{ color: 'rgba(0, 0, 0, 0.54)' }} />
                      </IconButton>
                    )}
                    {isBind && (
                      <Tooltip title="他の認証機器と連携">
                        <IconButton
                          onClick={() => {
                            if (callBind) callBind();
                          }}
                        >
                          <LinkIcon fontSize="small" sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {isKey && (
                      <Tooltip title="合鍵発行">
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            if (btnCallKey) btnCallKey(selectedRows);
                          }}
                          onMouseDown={(event) => event.stopPropagation()}
                          onMouseUp={(event) => event.stopPropagation()}
                        >
                          <KeyIcon fontSize="small" sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {isCsv && (
                      <>
                        <Tooltip title="CSVダウンロード">
                          <IconButton
                            onClick={() => {
                              if (onCsvClick) {
                                onCsvClick(true);
                                return;
                              }
                              gUtils.csvUtils.downloadLists(sortableData);
                            }}
                          >
                            <CloudDownloadIcon fontSize="small" sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excelダウンロード">
                          <IconButton
                            onClick={() => {
                              if (onCsvClick) {
                                onCsvClick(false);
                                return;
                              }
                              gUtils.csvUtils.downloadLists(sortableData, false);
                            }}
                          >
                            <SimCardDownloadIcon fontSize="small" sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {toolbarActions}
                    {isDel && (
                      <Tooltip title="削除">
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMenuOpen(event);
                          }}
                          onMouseDown={(event) => event.stopPropagation()}
                          onMouseUp={(event) => event.stopPropagation()}
                        >
                          <DeleteIcon fontSize="small" sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {callRefresh && (
                      <Tooltip title="リフレッシュ">
                        <IconButton onClick={callRefresh}>
                          <RefreshOutlinedIcon sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Menu
                      elevation={1}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                      }}
                      MenuListProps={{ disablePadding: true }}
                      id="customized-menu"
                      anchorEl={anchorEl}
                      keepMounted
                      open={Boolean(anchorEl)}
                      onClose={handleDeleteClose}
                    >
                      <MenuItem
                        disabled={selectedRows.length === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(e);
                          handleDeleteClose();
                        }}
                      >
                        削除
                      </MenuItem>
                    </Menu>
                  </Box>
                ) : (
                  <Box />
                )}
                {!isShowFooter ? (
                  <Box />
                ) : (
                  <CustomPagination
                    hasNext={hasNext}
                    count={sortableData.length}
                    showCount={onPageConfChange === null}
                    page={pageConf.page}
                    rowsPerPage={pageConf.rowsPerPage}
                    rowsPerPageOptions={rowsPerPageOptions || [pageConf.rowsPerPage]}
                    onChangePage={onChangePage}
                    onChangeRowsPerPage={onChangeRowsPerPage}
                  />
                )}
              </Box>
            </Box>
          }
          columns={columns}
          options={{
            customFooter: () => {
              if (!isShowFooter) return null;
              return (
                <tfoot>
                  <tr>
                    <CustomPagination
                      hasNext={hasNext}
                      page={pageConf.page}
                      count={sortableData.length}
                      showCount={onPageConfChange === null}
                      rowsPerPage={pageConf.rowsPerPage}
                      rowsPerPageOptions={rowsPerPageOptions || [pageConf.rowsPerPage]}
                      onChangePage={onChangePage}
                      onChangeRowsPerPage={onChangeRowsPerPage}
                      inTableFooter={true}
                    />
                  </tr>
                </tfoot>
              );
            }, // 根据状态决定是否渲染底部部分
            elevation: 0,
            print: false,
            download: false,
            rowHover: false,
            filter: false,
            selectableRows: selectableRows,
            pagination: false,
            // selectableRowsHeader:isRowSelect===undefined?true:false,
            search: false,
            viewColumns: false,
            responsive: 'vertical',
            filterType: 'checkbox',
            rowsSelected: (() => {
              const page = pageConf.page || 0;
              const rowsPerPage = pageConf.rowsPerPage || 50;
              const startIndex = page * rowsPerPage;
              const endIndex = Math.min(startIndex + rowsPerPage, sortableData.length);
              const currentPageSelected = [];
              for (let globalIndex of globalSelectedIndices) {
                if (globalIndex >= startIndex && globalIndex < endIndex) {
                  currentPageSelected.push(globalIndex - startIndex);
                }
              }
              return currentPageSelected;
            })(),
            rowsPerPage: pageConf.rowsPerPage,
            rowsPerPageOptions: rowsPerPageOptions ?? [pageConf.rowsPerPage], // 提供给用户的每页行数选项
            selectToolbarPlacement: 'none',
            customToolbarSelect: () => {},
            setTableProps: () => ({
              size: 'small',
              sx: { width: '100%' },
            }),
            onRowSelectionChange: (currentSelectedRows, allSelectedRows, rowsSelected) => {
              const page = pageConf.page || 0;
              const rowsPerPage = pageConf.rowsPerPage || 50;
              const startIndex = page * rowsPerPage;
              const globalIndices = rowsSelected.map((relativeIndex) => startIndex + relativeIndex);
              let filteredGlobalIndices = globalIndices;
              if (rowSelectable) {
                filteredGlobalIndices = globalIndices.filter((globalIndex) =>
                  rowSelectable(sortableData[globalIndex], globalIndex)
                );
              }
              setGlobalSelectedIndices((prevGlobal) => {
                const newGlobal = new Set(prevGlobal);
                for (let i = startIndex; i < startIndex + rowsPerPage && i < sortableData.length; i++) {
                  newGlobal.delete(i);
                }
                filteredGlobalIndices.forEach((index) => newGlobal.add(index));
                return newGlobal;
              });
            },
            onRowClick: (rowData, rowMeta) => {
              const idx = pageConf.page * pageConf.rowsPerPage + rowMeta.dataIndex;
              callRowClick && callRowClick(idx);
            },
            textLabels: {
              body: {
                noMatch: '検索結果は０件です',
              },
              pagination: {
                next: 'Next Page',
                previous: 'Previous Page',
                rowsPerPage: '表示数',
                displayRows: '/',
              },
            },
          }}
        />
      </ThemeProvider>
    </Stack>
  );
}
