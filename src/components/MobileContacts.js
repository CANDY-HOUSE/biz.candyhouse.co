import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import AddEmployee from '@/components/biz/device/AddEmployee';
import { useNavigate } from 'react-router-dom';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import MobileContactList from '@/components/MobileContactList';
import { biz3utils } from '@/utils/biz3utils';

const MobileContacts = () => {
  const { gManageEmployee, gStripe } = useContext(GlobalStateContext);
  const [tbData, settbData] = useState([]);
  const floatingAddRef = useRef(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

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
    [tbData]
  );

  return (
    <SesameFloatingAdd
      ref={floatingAddRef}
      isMobile={!gStripe.isFromApp}
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
        callRowClick={handleRowClick}
        callSearch={handleSearch}
        onDragEnd={
          isSearching
            ? null
            : (newData, _oldIdx, _newIdx) => {
                const reorderedData = newData.map((item, index) => ({
                  friendUUID: item.subUUID,
                  rank: -index,
                }));
                gManageEmployee.reorderEmployees(reorderedData);
              }
        }
      />
    </SesameFloatingAdd>
  );
};

export default MobileContacts;
