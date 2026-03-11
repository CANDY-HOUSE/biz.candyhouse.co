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

export default function RemoteList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { gAuth, gStripe, setSnackbarValue } = useContext(GlobalStateContext);

  const hub3DeviceId = searchParams.get('hub3DeviceId') || '';
  const irType = searchParams.get('irType');
  const formRemoteControlKey = 'formRemoteControlKey';
  console.info('RemoteList initialized with  irType:', irType);
  const cacheKey = `remoteList_${irType}`;
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
    searchRemoteList,
    loadMoreRemotes,
    setRemoteList,
    setIsLoading,
    clearSearchResults,
    setSearchResults,
  } = useRemoteCtrl(gAuth, gStripe, setSnackbarValue);

  const listRef = useRef(null);
  const itemRefs = useRef({});
  const hasRequestedRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const hasRestoredFromCache = useRef(false);

  const saveListToCache = useCallback(
    (listData, paginationData) => {
      try {
        const state = {
          remoteList: listData,
          pagination: paginationData,
          timestamp: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(state));
      } catch (error) {
        console.warn('save list to cache failed:', error);
      }
    },
    [cacheKey]
  );

  const saveSearchToCache = useCallback(
    (searchTerm, searchResults) => {
      try {
        const searchState = {
          searchTerm,
          searchResults,
          timestamp: Date.now(),
        };
        localStorage.setItem(`${cacheKey}_search`, JSON.stringify(searchState));
        localStorage.setItem(`${cacheKey}_searchTerm`, searchTerm);
      } catch (error) {
        console.warn('save search to cache failed:', error);
      }
    },
    [cacheKey]
  );

  const restoreListFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('restore list from cache failed:', error);
    }
    return null;
  }, [cacheKey]);

  const restoreSearchFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(`${cacheKey}_search`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('restore search from cache failed:', error);
    }
    return null;
  }, [cacheKey]);

  useEffect(() => {
    if (irType && !hasRequestedRef.current) {
      hasRequestedRef.current = true;

      const cachedListState = restoreListFromCache();

      if (cachedListState && cachedListState.remoteList?.length > 0) {
        console.log('restore list from cache, skip network request');
        hasRestoredFromCache.current = true;

        // Restore list data
        if (setRemoteList) {
          setRemoteList(cachedListState.remoteList);
        }

        if (cachedListState.pagination) {
          setPagination({ ...cachedListState.pagination });
          console.log('restore pagination state:', cachedListState.pagination);
        }

        // Only restore search state on back navigation
        const isBackNavigation = localStorage.getItem(formRemoteControlKey) === 'true';
        if (isBackNavigation) {
          const cachedSearchState = restoreSearchFromCache();
          if (cachedSearchState && cachedSearchState.searchTerm) {
            console.log('back navigation - restore search state:', cachedSearchState.searchTerm);
            setSearchTerm(cachedSearchState.searchTerm);

            if (cachedSearchState.searchResults?.length > 0 && setSearchResults) {
              setSearchResults(cachedSearchState.searchResults);
            }
          }
        } else {
          // Forward navigation, clear search state
          setSearchTerm('');
          if (clearSearchResults) {
            clearSearchResults();
          }
        }

        if (setIsLoading) {
          setIsLoading(false);
        }
      } else {
        // Cache is invalid or does not exist, re-request data
        setPagination({
          currentPage: 1,
          pageSize: 200,
          totalCount: 0,
          hasMore: true,
        });

        getRemoteList(irType, 1, 200, (response) => {
          if (response && response.data) {
            const responsePagination = response.data.pagination;
            setPagination(responsePagination);
            saveListToCache(response.data.data, responsePagination);
          }
        });
      }
    }
  }, [
    irType,
    getRemoteList,
    restoreListFromCache,
    restoreSearchFromCache,
    setRemoteList,
    setIsLoading,
    setSearchResults,
    clearSearchResults,
    saveListToCache,
  ]);

  const handleScroll = useCallback(() => {
    if (!listRef.current || isLoadingMore || !pagination?.hasMore || isLoadingMoreRef.current || searchTerm.trim()) {
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
        if (response) {
          const updatedPagination = response.data.pagination;
          setPagination(updatedPagination);

          setTimeout(() => {
            saveListToCache(remoteList, updatedPagination);
          }, 100);
        }
      });
    }
  }, [isLoadingMore, pagination?.hasMore, loadMoreRemotes, irType, searchTerm, remoteList, saveListToCache]);

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
      try {
        localStorage.setItem(`${cacheKey}_searchTerm`, value);
      } catch (error) {
        console.warn('save search term failed:', error);
      }

      // If the search term is empty, clear the search results
      if (!value.trim()) {
        if (clearSearchResults) {
          clearSearchResults();
        }
        localStorage.removeItem(`${cacheKey}_search`);
        localStorage.removeItem(`${cacheKey}_searchTerm`);
        return;
      }

      searchRemoteList(irType, value, (response) => {
        console.log('search finish:', response);
      });
    },
    [irType, searchRemoteList, clearSearchResults, cacheKey]
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

    const grouped = (remoteList || []).reduce((acc, item) => {
      const key = (item.direction || 'OTHER').toUpperCase();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({ ...item, index: acc[key].length });
      return acc;
    }, {});

    const alphabetList = Object.keys(grouped).sort();

    return {
      displayData: remoteList || [],
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

  const handleReturn = () => {
    localStorage.removeItem(formRemoteControlKey);
    localStorage.removeItem(`${cacheKey}_search`);
    localStorage.removeItem(`${cacheKey}_searchTerm`);
    navigate(-1);
  };

  // Loading State
  if (isLoading && !hasRestoredFromCache.current) {
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
                {displayData.map((item, index) => (
                  <ListItem
                    key={`search-${`${item.alias}-${index}`}`}
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
                      secondary={item.model && item.alias !== item.model ? item.model : undefined}
                      primaryTypographyProps={{
                        fontSize: '0.95rem',
                        color: 'text.primary',
                      }}
                      secondaryTypographyProps={{
                        fontSize: '0.8rem',
                        color: 'text.secondary',
                      }}
                    />
                  </ListItem>
                ))}
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
                      {groupedData[letter].map((item, _index) => (
                        <ListItem
                          key={`${letter}-${item.alias}-${item.index}`}
                          onClick={() => handleItemClick(item)}
                          sx={{
                            py: 1.0,
                            px: 0,
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <ListItemText
                            primary={item.alias}
                            primaryTypographyProps={{
                              fontSize: '0.95rem',
                              color: 'text.primary',
                            }}
                          />
                        </ListItem>
                      ))}
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
