import React, { useContext, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { KeyboardArrowLeft as KeyboardArrowLeftIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import { DataSearch } from '@/components/biz/device/DataSearch.js';
import { useRemoteCtrl } from '@/api/useRemoteCtrl.js';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { getRemoteSource } from '../utils/irRemoteUtils.js';
import {
  getRemoteListCache,
  putRemoteListCache,
  deleteRemoteListCache,
  getSearchCache,
  putSearchCache,
  deleteSearchCache,
  purgeRemoteListCache,
  removeLegacyLocalStorageLists,
  markRemoteListVerified,
  isRemoteListVerified,
} from '../utils/remoteListCache.js';

// 列表和搜索结果都缓存在 IndexedDB（见 remoteListCache.js），只存列表页和遥控器页实际用到的字段
const slimRemote = ({ code, model, alias, direction }) => ({ code, model, alias, direction });
const INITIAL_PAGINATION = { currentPage: 1, pageSize: 200, totalCount: 0, hasMore: true };

export default function RemoteList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { gAuth, gStripe, setSnackbarValue } = useContext(GlobalStateContext);

  const hub3DeviceId = searchParams.get('hub3DeviceId') || '';
  const irType = searchParams.get('irType');
  const formRemoteControlKey = 'formRemoteControlKey';
  console.info('RemoteList initialized with  irType:', irType);
  const [searchTerm, setSearchTerm] = useState('');
  const { gMediaType } = useContext(GlobalStateContext);
  const isMobile = gMediaType.isMobile;
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 200,
    totalCount: 0,
    hasMore: true,
  });

  const {
    remoteList,
    searchResults,
    isLoading,
    isLoadingMore,
    isSearching,
    getRemoteList,
    getRemoteListVersion,
    searchRemoteList,
    loadMoreRemotes,
    setRemoteList,
    clearSearchResults,
    setSearchResults,
  } = useRemoteCtrl(gAuth, gStripe, setSnackbarValue);

  const listRef = useRef(null);
  const itemRefs = useRef({});
  const hasRequestedRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const hasRestoredFromCache = useRef(false);
  // 列表是否已和后台核对过数据版本：核对前不写缓存、不加载下一页
  const versionCheckedRef = useRef(false);
  const [dataVersion, setDataVersion] = useState(null);
  // IndexedDB 读缓存是异步的，读完之前显示加载中
  const [restoring, setRestoring] = useState(true);

  const saveListToCache = useCallback(
    (listData, paginationData, version) => {
      // 没有数据版本就不缓存：无法判断是否过期的缓存宁可不要
      if (!version || !listData?.length) return;
      putRemoteListCache({
        irType,
        dataVersion: version,
        remoteList: listData.map(slimRemote),
        pagination: paginationData,
      });
    },
    [irType]
  );

  // 点进下一级页面时保存当前搜索，返回时恢复。带数据版本，与列表缓存版本不符就不恢复
  const saveSearchToCache = useCallback(
    (term, results) => {
      if (!dataVersion) return;
      putSearchCache({
        irType,
        dataVersion,
        searchTerm: term,
        searchResults: (results || []).map(slimRemote),
      });
    },
    [irType, dataVersion]
  );

  const clearSearchState = useCallback(() => {
    deleteSearchCache(irType);
    setSearchTerm('');
    if (clearSearchResults) {
      clearSearchResults();
    }
  }, [irType, clearSearchResults]);

  // 采用后台刚返回的第 1 页：记下版本；版本不同的旧缓存（所有品类）一并清掉，没有版本号则全部清掉
  const applyFreshFirstPage = useCallback(
    (data) => {
      const version = data.dataVersion || null;
      purgeRemoteListCache(version);
      markRemoteListVerified(irType, version);
      versionCheckedRef.current = true;
      setPagination(data.pagination);
      setDataVersion(version);
    },
    [irType]
  );

  const fetchFirstPage = useCallback(() => {
    setPagination({ ...INITIAL_PAGINATION });
    getRemoteList(irType, 1, 200, (response) => {
      if (response?.success && response.data?.pagination) {
        applyFreshFirstPage(response.data);
      }
    });
  }, [irType, getRemoteList, applyFreshFirstPage]);

  // 后台数据版本变了（或拿不到版本号）：删掉本品类缓存，从第 1 页重新加载；新数据到之前仍显示当前列表。
  // 其他品类的旧版本缓存在 applyFreshFirstPage 里按新版本一并清掉
  const discardCacheAndReload = useCallback(() => {
    hasRestoredFromCache.current = true;
    versionCheckedRef.current = false;
    deleteRemoteListCache(irType);
    clearSearchState();
    fetchFirstPage();
  }, [irType, clearSearchState, fetchFirstPage]);

  useEffect(() => {
    if (!irType || hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    removeLegacyLocalStorageLists();
    const isBackNavigation = localStorage.getItem(formRemoteControlKey) === 'true';

    Promise.all([getRemoteListCache(irType), isBackNavigation ? getSearchCache(irType) : null]).then(
      ([cached, cachedSearch]) => {
        setRestoring(false);

        if (!cached?.dataVersion || !cached.remoteList?.length) {
          // 本地没有数据（或旧数据没有版本号，无法判断是否过期）：清掉，直接请求服务器数据
          if (cached) {
            deleteRemoteListCache(irType);
          }
          deleteSearchCache(irType);
          fetchFirstPage();
          return;
        }

        // 本地有数据：立即显示
        hasRestoredFromCache.current = true;
        if (setRemoteList) {
          setRemoteList(cached.remoteList);
        }
        if (cached.pagination) {
          setPagination({ ...cached.pagination });
        }

        // 搜索状态只在从下一级页面返回时恢复，且必须与列表是同一数据版本
        if (isBackNavigation && cachedSearch?.searchTerm && cachedSearch.dataVersion === cached.dataVersion) {
          console.log('back navigation - restore search state:', cachedSearch.searchTerm);
          setSearchTerm(cachedSearch.searchTerm);
          if (cachedSearch.searchResults?.length > 0 && setSearchResults) {
            setSearchResults(cachedSearch.searchResults);
          }
        } else {
          if (cachedSearch) {
            deleteSearchCache(irType);
          }
          setSearchTerm('');
          if (clearSearchResults) {
            clearSearchResults();
          }
        }

        // 从下一级页面返回、且本次会话已核对过这份缓存的版本：直接显示，不再请求
        if (isBackNavigation && isRemoteListVerified(irType, cached.dataVersion)) {
          versionCheckedRef.current = true;
          setDataVersion(cached.dataVersion);
          return;
        }

        // 进入列表：显示本地数据的同时只请求版本号核对
        getRemoteListVersion(irType, (response) => {
          const latestVersion = response?.data?.dataVersion || null;
          if (latestVersion && latestVersion === cached.dataVersion) {
            markRemoteListVerified(irType, latestVersion);
            versionCheckedRef.current = true;
            setDataVersion(latestVersion);
            return;
          }
          // 没拿到版本号（含请求报错）或版本变了：清掉旧数据，重新请求第 1 页
          console.log('remote list data version changed:', cached.dataVersion, '->', latestVersion);
          discardCacheAndReload();
        });
      }
    );
  }, [
    irType,
    setRemoteList,
    setSearchResults,
    clearSearchResults,
    getRemoteListVersion,
    discardCacheAndReload,
    fetchFirstPage,
  ]);

  // 列表或分页变化后写缓存。放在 effect 里，读到的一定是追加完新一页的最新列表
  // （原先在加载下一页的回调里写，拿到的是回调创建时的旧 remoteList，缓存会少最新一页）
  useEffect(() => {
    if (versionCheckedRef.current) {
      saveListToCache(remoteList, pagination, dataVersion);
    }
  }, [remoteList, pagination, dataVersion, saveListToCache]);

  const handleScroll = useCallback(() => {
    if (
      !listRef.current ||
      isLoadingMore ||
      !pagination?.hasMore ||
      isLoadingMoreRef.current ||
      searchTerm.trim() ||
      !versionCheckedRef.current
    ) {
      console.log(
        'current state:',
        '!listRef.current =',
        !listRef.current,
        ', isLoadingMore =',
        isLoadingMore,
        ', pagination?.hasMore =',
        !pagination?.hasMore,
        ', isLoadingMoreRef.current =',
        isLoadingMoreRef.current,
        ', searchTerm.trim() =',
        searchTerm.trim()
      );
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.8) {
      isLoadingMoreRef.current = true;

      loadMoreRemotes(irType, pagination, (response) => {
        isLoadingMoreRef.current = false;
        if (!response?.success || !response.data?.pagination) return;
        // 翻页途中后台数据更新了：前后页不是同一版本，整体重载
        if ((response.data.dataVersion || null) !== dataVersion) {
          discardCacheAndReload();
          return;
        }
        setPagination(response.data.pagination);
      });
    }
  }, [isLoadingMore, pagination, loadMoreRemotes, irType, searchTerm, dataVersion, discardCacheAndReload]);

  useEffect(() => {
    const listElement = listRef.current;
    if (listElement) {
      listElement.addEventListener('scroll', handleScroll);
      return () => {
        listElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  useEffect(() => {
    if (!isLoadingMore) {
      isLoadingMoreRef.current = false;
    }
  }, [isLoadingMore]);

  const handleSearch = useCallback(
    (value) => {
      setSearchTerm(value);

      // If the search term is empty, clear the search results
      if (!value.trim()) {
        if (clearSearchResults) {
          clearSearchResults();
        }
        deleteSearchCache(irType);
        return;
      }

      searchRemoteList(irType, value, (response) => {
        console.log('search finish:', response);
      });
    },
    [irType, searchRemoteList, clearSearchResults]
  );

  const { displayData, groupedData, alphabetList, isSearchingMode } = useMemo(() => {
    const isSearchingMode = searchTerm.trim().length > 0;

    if (isSearchingMode) {
      return {
        displayData: searchResults || [],
        groupedData: {},
        alphabetList: [],
        isSearchingMode: true,
      };
    }

    // 13 个品类的真实数据已于 2026-09-23 导入 ir_remotes（77,356 条），
    // 原先「后台没数据就塞一条演示遥控器」的兜底已移除 —— 列表为空就该显示为空，
    // 否则请求失败时冒出假条目会让人误以为后台有数据。
    const effectiveList = remoteList || [];

    const grouped = effectiveList.reduce((acc, item) => {
      const key = (item.direction || 'OTHER').toUpperCase();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({ ...item, index: acc[key].length });
      return acc;
    }, {});

    const alphabetList = Object.keys(grouped).sort();

    return {
      displayData: effectiveList,
      groupedData: grouped,
      alphabetList,
      isSearchingMode: false,
    };
  }, [remoteList, searchResults, searchTerm]);

  const handleItemClick = useCallback(
    (item) => {
      console.log('select remote control:', item);

      // Only save search info when clicking to enter the next page
      if (searchTerm.trim()) {
        saveSearchToCache(searchTerm, searchResults);
      }
      localStorage.setItem(formRemoteControlKey, true);

      let path = '';
      let irTypeNum = parseInt(irType);
      if (irTypeNum === 0xc000) {
        path = '/biz/access-control/remote-air';
      } else {
        path = '/biz/access-control/remote-non-air';
      }
      const processedAlias = item.alias ? item.alias.split('\n')[0].trim() : item.alias;
      let remote = { ...item, type: irTypeNum, alias: processedAlias };
      navigate({
        pathname: path,
        search: createSearchParams({
          hub3DeviceId: hub3DeviceId,
          remote: JSON.stringify(remote),
          ...(gStripe.isFromApp && { fromType: 'app' }),
        }).toString(),
      });
    },
    [navigate, hub3DeviceId, irType, searchTerm, searchResults, saveSearchToCache]
  );

  const renderRemoteItem = useCallback(
    (item, key) => (
      <ListItem
        key={key}
        onClick={() => handleItemClick(item)}
        sx={{
          py: 0.5,
          px: 0,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <ListItemText
          primary={item.alias || item.model}
          secondary={getRemoteSource(item, t)}
          primaryTypographyProps={{
            fontSize: '0.95rem',
            color: 'text.primary',
          }}
          secondaryTypographyProps={{
            fontSize: '0.8rem',
            color: 'text.disabled',
          }}
        />
      </ListItem>
    ),
    [handleItemClick, t]
  );

  const handleReturn = () => {
    localStorage.removeItem(formRemoteControlKey);
    deleteSearchCache(irType);
    navigate(-1);
  };

  // Loading State
  if (restoring || (isLoading && !hasRestoredFromCache.current)) {
    return (
      <Card sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {!isMobile && (
                <IconButton onClick={() => handleReturn()}>
                  <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
                </IconButton>
              )}
              <Typography
                variant="h6"
                sx={{
                  fontSize: '1.2em',
                  fontWeight: 'bold',
                  lineHeight: '1.3',
                  ml: 1,
                }}
              >
                {t('pages.ir.remote.selectRemote')}
              </Typography>
            </Box>
          }
        />
        <CardContent sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              {t('pages.ir.remote.loading')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Main Render
  return (
    <Card sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isMobile && (
              <IconButton onClick={() => handleReturn()}>
                <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
              </IconButton>
            )}
            <Typography
              variant="h6"
              sx={{
                fontSize: '1.2em',
                fontWeight: 'bold',
                lineHeight: '1.3',
                ml: 1,
              }}
            >
              {t('pages.ir.remote.selectRemote')}
            </Typography>
          </Box>
        }
      />

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: 0 }}>
        <Box sx={{ mb: 2 }}>
          <DataSearch callSearch={handleSearch} initialValue={searchTerm} />
        </Box>
        {!searchTerm.trim() && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.875rem', lineHeight: 1.4 }}>
            {t('pages.ir.remote.searchHint')}
          </Typography>
        )}
        <Box sx={{ flex: 1, display: 'flex', position: 'relative' }}>
          <Box
            ref={listRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              pr: isSearchingMode ? 0 : 1,
              maxHeight: 'calc(100vh - 200px)',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
            }}
          >
            {isSearching && searchTerm.trim() && searchResults.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    {t('pages.ir.remote.searching')}
                  </Typography>
                </Box>
              </Box>
            )}

            {displayData.length === 0 && !isLoading && !isSearching ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm ? t('pages.ir.remote.noSearchResults') : t('pages.ir.remote.noRemoteData')}
                </Typography>
              </Box>
            ) : isSearchingMode ? (
              <List disablePadding>
                {displayData.map((item, index) => renderRemoteItem(item, `search-${item.alias}-${index}`))}
              </List>
            ) : (
              <>
                {alphabetList.map((letter) => (
                  <Box key={letter}>
                    <Typography
                      ref={(el) => (itemRefs.current[letter] = el)}
                      sx={{
                        fontSize: '0.95rem',
                        fontWeight: 'normal',
                        color: 'text.primary',
                        py: 1.0,
                        px: 0,
                        mb: 0,
                      }}
                    >
                      {letter}
                    </Typography>

                    <List disablePadding>
                      {groupedData[letter].map((item, _index) =>
                        renderRemoteItem(item, `${letter}-${item.alias}-${item.index}`)
                      )}
                    </List>
                  </Box>
                ))}

                {pagination.hasMore && !isSearchingMode && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="text.secondary">
                        {t('pages.ir.remote.loadingMore')}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {!pagination.hasMore && remoteList.length > 0 && !isSearchingMode && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('pages.ir.remote.loadedAll', { count: remoteList.length })}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
