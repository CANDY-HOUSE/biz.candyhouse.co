import React, { useContext, useEffect, useRef, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import DataTable from '@/components/biz/device/DataTable';
import AddEmployee from '@/components/biz/device/AddEmployee';
import { createSearchParams, useNavigate } from 'react-router-dom';
import CmSureCancel from '@components/biz/device/CmSureCancel';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';

const EmployeeList = () => {
  const { gManageEmployee, setModalTitle, setModalContent, setCustomModalOpen, gStripe, gMediaType } =
    useContext(GlobalStateContext);
  const [tbData, settbData] = useState([]);
  const [tags, setTags] = useState([]);
  const floatingAddRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!gStripe.customerInfo.companyID) return;
    if (gManageEmployee.tags.length < 1) {
      gManageEmployee.getTags();
    }
  }, [gStripe.customerInfo.companyID]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    settbData(gManageEmployee.employees.Items);
    setTags(gManageEmployee.tags);
  }, [gManageEmployee.employees, gManageEmployee.tags]);

  const showSureCancel = async (call) => {
    setModalTitle('');
    setModalContent(
      <CmSureCancel
        title={'ユーザーが削除されます'}
        message={
          '認証機器とHub3との通信が不安定な場合、ユーザーに紐づいたカード・指紋が同時に削除されない可能性がございます。\n通信状況をご確認のうえで操作ください。'
        }
        cancelClick={() => {
          setCustomModalOpen(false);
        }}
        sureClick={() => {
          setCustomModalOpen(false);
          if (call) call();
        }}
      />
    );
    setCustomModalOpen(true);
  };

  const findSearchList = (items, key) => {
    return items.filter((item) => {
      const employeeName = item.employeeName || '';
      const employeeEmail = item.employeeEmail || '';
      return employeeName.includes(key) || employeeEmail.includes(key);
    });
  };

  return (
    <SesameFloatingAdd
      ref={floatingAddRef}
      isMobile={gMediaType.isMobile}
      popupComponent={
        <AddEmployee
          tags={tags}
          completionCallback={() => {
            floatingAddRef.current.handleClose();
          }}
        />
      }
    >
      <DataTable
        isMobile={gMediaType.isMobile}
        isAdd={false}
        data={tbData}
        rowHeight={'large'}
        isBind={false}
        isBack={false}
        columns={DataTableColumns.employeeList()}
        callAdd={
          gMediaType.isMobile
            ? null
            : () => {
                floatingAddRef.current.handleOpen();
              }
        }
        rowSelectable={(data, _idx) => {
          return data?.tag && data.tag[0] !== 'オーナー';
        }}
        callRowClick={(index) => {
          navigate({
            pathname: '/biz/employees/list-item',
            search: createSearchParams({ uid: tbData[index].subUUID }).toString(),
          });
        }}
        callDelData={(items) => {
          showSureCancel(async function () {
            gManageEmployee.removeEmployees(items);
          });
        }}
        callSearch={(e) => {
          if (e) {
            settbData(findSearchList(gManageEmployee.employees.Items, e));
          } else {
            settbData(gManageEmployee.employees.Items);
          }
        }}
      />
    </SesameFloatingAdd>
  );
};

export default EmployeeList;
