import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Skeleton,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import SideBarMenu from '../SideBarMenu';

export const LoadingPage = ({ left = true, right = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams] = useSearchParams();
  const isFromApp = searchParams.get('fromType') === 'app';
  const isWidget = searchParams.get('displayType') === 'widget';

  return isWidget ? (
    <></>
  ) : (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* AppBar */}
      <AppBar position="static" sx={{ bgcolor: '#F1F1F1', boxShadow: 'none', display: isFromApp ? 'none' : 'block' }}>
        <Toolbar
          sx={{
            width: '100%',
            justifyContent: 'space-between',
            height: '60px',
            minHeight: 'unset',
            pt: '',
            pl: '17px !important',
            pr: '19px !important',
          }}
        >
          <Box sx={{ display: 'inline-flex' }}>
            <SideBarMenu />
          </Box>
          <Box />
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Sidebar */}
        {left === true && (
          <Box
            sx={{
              width: 180,
              padding: 2,
              display: isMobile || isFromApp ? 'none' : 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* 上部分5个项目 */}
            <Box>
              {[...Array(5)].map((_, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="100%" height={30} />
                </Box>
              ))}
            </Box>
            {/* 下部分3个项目 */}
            <Box>
              {[...Array(3)].map((_, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="100%" height={30} />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Content */}
        {right === true && (
          <Box sx={{ flexGrow: 1, padding: isMobile ? 2 : 3 }}>
            {/* Search and function area */}
            <Box sx={{ mb: 3, px: 1.5 }}>
              <Skeleton
                variant="rounded"
                width={isMobile ? '100%' : 200}
                height={isMobile ? 10 : 30}
                sx={{
                  mb: 2,
                }}
              />
              {!isMobile && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Skeleton variant="text" width={100} height={20} sx={{ mr: 2 }} />
                </Box>
              )}
            </Box>

            {isMobile || isFromApp ? (
              /* 移动端用户列表 - 极简抽象设计 */
              <Box>
                {[...Array(9)].map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      mb: 1.5,
                      p: 1.5,
                      bgcolor: 'white',
                      borderRadius: '4px',
                    }}
                  >
                    {/* 每个项目只有3个横向矩形 */}
                    <Skeleton variant="text" width="70%" height={16} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="90%" height={16} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                ))}
              </Box>
            ) : (
              /* 桌面端表格 */
              <Table sx={{ '& .MuiTableCell-root': { border: 'none', backgroundColor: 'white', paddingLeft: 2 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Skeleton variant="text" width={20} height={20} />
                    </TableCell>
                    {[...Array(5)].map((_, index) => (
                      <TableCell key={index}>
                        <Skeleton variant="text" width={index === 1 ? 150 : 100} />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...Array(5)].map((_, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell padding="checkbox">
                        <Skeleton variant="text" width={20} height={20} />
                      </TableCell>
                      {[...Array(5)].map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton variant="text" width={cellIndex === 1 ? 150 : 100} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LoadingPage;
