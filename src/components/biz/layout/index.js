import siteIcon from '@assets/site-icon.png';
import { URLs } from '@constants/URLs';
import { GlobalStateContext } from '@context/GlobalContextProvider.js';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import { LoadingButton } from '@mui/lab';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  Grid2,
  IconButton,
  List,
  ListItem,
  Menu,
  MenuItem,
  Modal,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import Divider from '@mui/material/Divider';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import LoadingPage from './Auth/LoadingPage.js';
import PrivateRoute from './Auth/PrivateRoute.js';
import BuildInfoBar from './BuildInfoBar.js';
import Navigator from './Navigator.js';
import SideBarMenu from './SideBarMenu.js';
import WsStatusIndicator from '@/components/WsStatusIndicator.js';
import CSUserSearchDialog from '@/components/biz/device/CSUserSearchDialog';

const Layout = () => {
  const navigate = useNavigate();
  const { gAuth, gStripe, gMediaType, gManageEmployee, setSnackbarValue } = useContext(GlobalStateContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [csSearchOpen, setCsSearchOpen] = useState(false);
  const isMobile = gMediaType.isMobile;
  const isFromApp = gStripe.isFromApp;

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: isMobile ? '90%' : 500,
    bgcolor: 'background.paper',
    borderRadius: '5px',
    padding: 4,
  };

  const menuWidth = '180px';
  const headerHeight = '60px';
  const iconHeight = '60px';

  const [anchorEl, setAnchorEl] = useState(null);
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const location = useLocation();

  const toggleDrawer = (open) => (event) => {
    if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  useEffect(() => {
    if (open) {
      setNewCompany('');
    }
  }, [gStripe.customerInfo.name, open]);

  const SidebarContent = useMemo(() => {
    return ({ onItemClick }) => (
      <>
        <List disablePadding>
          <ListItem
            component={'a'}
            style={{ textDecoration: 'none', color: '#111111', height: iconHeight }}
            onClick={() => {
              window.open(URLs.url, '_blank');
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              <img src={siteIcon} width={30} height={30} alt="icon" />
            </Box>
          </ListItem>
        </List>
        <Navigator location={location} onClick={onItemClick} />
      </>
    );
  }, [location.pathname, iconHeight]);

  return (
    <PrivateRoute>
      <>
        <Grid2 container style={{ minHeight: '100%' }}>
          <AppBar
            position="fixed"
            elevation={0}
            sx={{ color: '#111111', backgroundColor: '#F1F1F1', display: isFromApp ? 'none' : 'block' }}
          >
            <Toolbar
              variant="dense"
              sx={{
                width: '100%',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: iconHeight,
                minHeight: 'unset',
              }}
            >
              <Box sx={{ display: 'inline-flex' }}>
                {isMobile ? (
                  <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleDrawer(true)}>
                    <MenuIcon />
                  </IconButton>
                ) : (
                  <SideBarMenu />
                )}
              </Box>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                <Typography variant="h4">{gStripe.customerInfo?.name || ''}</Typography>
                <WsStatusIndicator />
                <KeyboardArrowDownIcon onClick={(event) => setAnchorEl(event.currentTarget)} />
              </Box>
              <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => {
                  setAnchorEl(null);
                }}
                MenuListProps={{ 'aria-labelledby': 'basic-button' }}
                sx={{ borderRadius: '0px' }}
              >
                {gStripe.companies.map((row, _index) => (
                  <Box key={row.companyID}>
                    <MenuItem
                      value={row.companyID}
                      onClick={(_e) => {
                        localStorage.setItem('curLogin', row.companyID);
                        gStripe.getCustomerInfo(row.companyID);
                        setAnchorEl(null);
                        navigate(row.isSesameApp ? '/' : '/biz');
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                      }}
                    >
                      {/* 选中标记区域 - 固定宽度 */}
                      <Box
                        sx={{
                          width: '24px',
                          display: 'flex',
                          justifyContent: 'center',
                          marginRight: '8px',
                        }}
                      >
                        {row.companyID === gStripe.customerInfo.companyID &&
                          !gStripe.customerInfo?.tag?.includes('ゲスト') && <CheckIcon />}
                      </Box>
                      {/* 头像区域 - 固定宽度 */}
                      <Box
                        sx={{
                          width: '24px', // 固定宽度
                          marginRight: '8px',
                          display: 'flex',
                          justifyContent: 'center',
                        }}
                      >
                        {row.isSesameApp ? (
                          <PersonIcon sx={{ color: '#333333' }}></PersonIcon>
                        ) : (
                          <SpaceDashboardIcon sx={{ color: '#333333', fontSize: '20px' }} />
                        )}
                      </Box>
                      {/* 文本内容 */}
                      <Typography>{row.name}</Typography>
                    </MenuItem>
                  </Box>
                ))}
                <MenuItem
                  onClick={() => {
                    handleOpen();
                  }}
                  sx={{ paddingLeft: '50px' }}
                >
                  <AddIcon sx={{ fontSize: '14px', mr: '5px' }} />
                  新規会社登録
                </MenuItem>
                <Divider />
                {/* CS */}
                {!!gStripe.customerInfo?.isCS && (
                  <MenuItem
                    sx={{ padding: '10px 50px' }}
                    onClick={() => {
                      setAnchorEl(null);
                      setCsSearchOpen(true);
                    }}
                  >
                    CS Search
                  </MenuItem>
                )}
                {/* 退出 */}
                <MenuItem
                  sx={{ padding: '10px 50px' }}
                  onClick={() => {
                    gAuth.handleSignout();
                  }}
                >
                  ログアウト
                </MenuItem>
              </Menu>
            </Toolbar>

            {/* 彈窗 */}
            <Modal
              open={open}
              onClose={(event, reason) => {
                if (reason === 'backdropClick') return;
                handleClose();
              }}
            >
              <Box sx={style}>
                {/* 切換公司名稱或新增公司 */}
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', paddingBottom: '16px' }}>
                    新規会社登録
                  </Typography>
                  <Box
                    fullWidth="true"
                    sx={{
                      display: 'flex',
                      mt: '5px',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                    }}
                  >
                    <Typography sx={{ mr: '5px', mb: isMobile ? '5px' : '0' }}>会社名</Typography>
                    <TextField
                      required
                      size="small"
                      sx={{
                        border: '1px solid #F1F1F1',
                        borderRadius: '5px',
                        width: isMobile ? '100%' : '60%',
                      }}
                      value={newCompany}
                      onChange={(e) => {
                        setNewCompany(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      mt: '10px',
                    }}
                  >
                    <Button
                      disabled={isPending}
                      size="small"
                      sx={{ mr: '10px' }}
                      onClick={() => {
                        setOpen(false);
                        setAnchorEl(null);
                      }}
                    >
                      キャンセル
                    </Button>
                    <LoadingButton
                      loading={isPending}
                      disableElevation
                      size="small"
                      variant="contained"
                      sx={{
                        color: 'white',
                        minWidth: '120px',
                      }}
                      disabled={newCompany === ''}
                      onClick={() => {
                        setIsPending(true);
                        gStripe.addCompany(
                          newCompany,
                          gStripe.customerInfo.employeeEmail,
                          gStripe.customerInfo.subUUID,
                          (_res) => {
                            setIsPending(false);
                            handleClose();
                            setNewCompany('');
                          }
                        );
                      }}
                    >
                      会社を登録
                    </LoadingButton>
                  </Box>
                </Box>
              </Box>
            </Modal>
          </AppBar>
          {!isMobile && !isFromApp ? (
            <Grid2
              className="Navi"
              sx={{
                height: '100%',
                width: menuWidth,
                position: 'fixed',
                left: '0px',
                top: '0px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <SidebarContent />
              <BuildInfoBar />
            </Grid2>
          ) : (
            <Drawer
              anchor="left"
              open={isMobile && drawerOpen}
              onClose={toggleDrawer(false)}
              PaperProps={{
                sx: {
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': {
                    display: 'none',
                  },
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                },
              }}
            >
              <Box sx={{ width: 250 }} role="presentation">
                <SidebarContent onItemClick={isMobile ? toggleDrawer(false) : undefined} />
                <BuildInfoBar />
              </Box>
            </Drawer>
          )}

          <Grid2
            className="child"
            sx={{
              marginTop: isFromApp ? 0 : headerHeight,
              marginLeft: isMobile || isFromApp ? '0' : menuWidth,
              width: isMobile || isFromApp ? '100%' : `calc(100% - ${menuWidth})`,
              height: '100vh',
            }}
          >
            <Outlet />
          </Grid2>
        </Grid2>
        {gStripe.isPending && (
          <Grid2
            sx={{
              position: 'fixed',
              margin: 'auto auto',
              zIndex: '999',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'white',
            }}
          >
            <LoadingPage />
          </Grid2>
        )}
        <CSUserSearchDialog
          open={csSearchOpen}
          gManageEmployee={gManageEmployee}
          gAuth={gAuth}
          setSnackbarValue={setSnackbarValue}
          onClose={() => setCsSearchOpen(false)}
        />
      </>
    </PrivateRoute>
  );
};

export default Layout;
