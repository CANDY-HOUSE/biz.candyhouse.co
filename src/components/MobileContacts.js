import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import AddEmployee from '@/components/biz/device/AddEmployee';
import { createSearchParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import MasterDetail, { fabInListSx, useMasterDetail } from '@/components/MasterDetail';
import { DetailPanelContext } from '@/components/detailPanelContext';
import { ContactsNavIcon } from '@/components/biz/layout/navIcons';
import EmployeeItem from '@/pages/biz/employees/list-item/EmployeeItem';
import { ios } from '@/theme/appHomeStyle';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import MobileContactList from '@/components/MobileContactList';
import { biz3utils } from '@/utils/biz3utils';

const MobileContacts = () => {
  const { gManageEmployee, gStripe } = useContext(GlobalStateContext);
  const [tbData, settbData] = useState([]);
  const floatingAddRef = useRef(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const masterDetail = useMasterDetail();
  const selectedUUID = masterDetail ? searchParams.get('uid') : null;

  // The selection replaces the list's history entry, so back leaves the list as before.
  const selectContact = useCallback(
    (user) => {
      navigate(
        {
          pathname: '/contacts',
          search: user ? createSearchParams({ uid: user.subUUID, email: user.employeeEmail }).toString() : '',
        },
        { replace: true }
      );
    },
    [navigate]
  );

  // Removed contacts can linger in the list until it refreshes; never pick one of them.
  const removedUUIDs = useRef([]);
  const firstContact = gManageEmployee.employees.Items.find((user) => !removedUUIDs.current.includes(user.subUUID));
  useEffect(() => {
    if (masterDetail && !selectedUUID && firstContact) selectContact(firstContact);
  }, [masterDetail, selectedUUID, firstContact?.subUUID]);

  const panel = useMemo(
    () => ({
      onRemoved: (uid) => {
        removedUUIDs.current.push(uid);
        selectContact(null);
      },
    }),
    [selectContact]
  );

  useEffect(() => {
    settbData(gManageEmployee.employees.Items);
  }, [gManageEmployee.employees, gManageEmployee.tags]);

  const findSearchList = (items, key) => {
    return items.filter((item) => {
      const employeeName = item.employeeName || '';
      const employeeEmail = item.employeeEmail || '';
      return employeeName.includes(key) || employeeEmail.includes(key);
    });
  };

  const handleSearch = useCallback(
    (e) => {
      if (e) {
        settbData(findSearchList(gManageEmployee.employees.Items, e));
      } else {
        settbData(gManageEmployee.employees.Items);
      }
      setIsSearching(!!e);
    },
    [gManageEmployee.employees.Items]
  );

  useEffect(() => {
    if (gStripe.isFromApp) {
      gManageEmployee.getEmployees();
    }
  }, []);

  const handleOpenPage = (paramStr) => {
    const { protocol, host } = new URL(window.location.href);
    const domainUrl = `${protocol}//${host}`;
    const fullUrl = `${domainUrl}/biz/employees/list-item?${paramStr}`;
    const scheme = `ssm://UI/webview/open?${new URLSearchParams({
      notifyName: 'FriendChanged',
      url: fullUrl,
    })}`;
    biz3utils.triggerScheme(scheme);
  };

  const handleRowClick = useCallback(
    (index) => {
      if (masterDetail) {
        selectContact(tbData[index]);
        return;
      }
      const newSearchParams = new URLSearchParams(new URLSearchParams(window.location.search));
      newSearchParams.set('uid', tbData[index].subUUID);
      newSearchParams.set('email', tbData[index].employeeEmail);
      if (gStripe.isFromApp) {
        handleOpenPage(newSearchParams.toString());
      } else {
        navigate({
          pathname: '/biz/employees/list-item',
          search: newSearchParams.toString(),
        });
      }
    },
    [tbData, masterDetail, selectContact]
  );

  const list = (
    <SesameFloatingAdd
      ref={floatingAddRef}
      isMobile={!gStripe.isFromApp}
      fabSx={masterDetail ? fabInListSx : undefined}
      popupComponent={
        <AddEmployee
          completionCallback={() => {
            floatingAddRef.current.handleClose();
          }}
        />
      }
    >
      <MobileContactList
        contacts={tbData}
        isEmpty={gManageEmployee.employees.Items.length === 0}
        callRowClick={handleRowClick}
        callSearch={handleSearch}
        selectedUUID={selectedUUID}
        onDragEnd={
          isSearching
            ? null
            : (newData, _oldIdx, _newIdx) => {
                const reorderedData = newData.map((item, index) => ({
                  friendUUID: item.subUUID,
                  rank: -index,
                }));
                settbData(newData);
                gManageEmployee.reorderEmployees(reorderedData, (response) => {
                  if (!response.success) gManageEmployee.getEmployees();
                });
              }
        }
      />
    </SesameFloatingAdd>
  );

  if (!masterDetail) return list;
  return (
    <MasterDetail
      list={list}
      placeholder={<ContactsNavIcon size={72} />}
      panel={
        selectedUUID && (
          <DetailPanelContext.Provider value={panel}>
            <Box sx={{ height: '100%', overflow: 'auto', p: '12px', bgcolor: ios.card, borderRadius: ios.cardRadius }}>
              <EmployeeItem key={selectedUUID} />
            </Box>
          </DetailPanelContext.Provider>
        )
      }
    />
  );
};

export default MobileContacts;
