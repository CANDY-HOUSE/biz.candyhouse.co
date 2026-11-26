import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { createSearchParams, useNavigate, useSearchParams } from 'react-router-dom';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import AddEmployee from '@/components/biz/device/AddEmployee';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import DataTable from '@/components/biz/device/DataTable';
import CmSureCancel from '@components/biz/device/CmSureCancel';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import MasterDetail, { fabInListSx, useMasterDetail } from '@/components/MasterDetail';
import { DetailPanelContext } from '@/components/detailPanelContext';
import { ContactsNavIcon } from '@/components/biz/layout/navIcons';
import MobileContactList from '@/components/MobileContactList';
import EmployeeItem from '@/pages/biz/employees/list-item/EmployeeItem';
import { ios } from '@/theme/appHomeStyle';
import { biz3utils } from '@/utils/biz3utils';
import { PATHS } from '@/routes/manifest';
import { useTranslation } from 'react-i18next';

const matches = (item, key) => (item.employeeName || '').includes(key) || (item.employeeEmail || '').includes(key);

// One member list for both spaces: the personal space shows contacts as cards, a company shows its users as a table.
export default function MemberList() {
  const { gManageEmployee, gStripe } = useContext(GlobalStateContext);
  const items = gManageEmployee.employees.Items;
  const [query, setQuery] = useState('');
  const rows = useMemo(() => (query ? items.filter((item) => matches(item, query)) : items), [items, query]);
  const View = gStripe.customerInfo.isSesameApp ? ContactCards : UserTable;
  return <View items={items} rows={rows} query={query} onSearch={(text) => setQuery(text || '')} />;
}

const AddPopup = ({ floatingAddRef, tags }) => (
  <AddEmployee tags={tags} completionCallback={() => floatingAddRef.current.handleClose()} />
);

const UserTable = ({ rows, onSearch }) => {
  const { gManageEmployee, setModalTitle, setModalContent, setCustomModalOpen, gStripe, gMediaType } =
    useContext(GlobalStateContext);
  const floatingAddRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!gStripe.customerInfo.companyID) return;
    if (gManageEmployee.tags.length < 1) gManageEmployee.getTags();
  }, [gStripe.customerInfo.companyID]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmRemove = (onConfirm) => {
    setModalTitle('');
    setModalContent(
      <CmSureCancel
        title={t('manage.member.removeTitle')}
        message={t('manage.member.removeMessage')}
        cancelClick={() => setCustomModalOpen(false)}
        sureClick={() => {
          setCustomModalOpen(false);
          onConfirm();
        }}
      />
    );
    setCustomModalOpen(true);
  };

  return (
    <SesameFloatingAdd
      ref={floatingAddRef}
      isMobile={gMediaType.isMobile}
      popupComponent={<AddPopup floatingAddRef={floatingAddRef} tags={gManageEmployee.tags} />}
    >
      <DataTable
        isMobile={gMediaType.isMobile}
        isAdd={false}
        data={rows}
        rowHeight={'large'}
        isBind={false}
        isBack={false}
        columns={DataTableColumns.employeeList()}
        callAdd={gMediaType.isMobile ? null : () => floatingAddRef.current.handleOpen()}
        rowSelectable={(data) => data?.tag && data.tag[0] !== 'オーナー'}
        callRowClick={(index) =>
          navigate({
            pathname: PATHS.members.item,
            search: createSearchParams({ uid: rows[index].subUUID }).toString(),
          })
        }
        callDelData={(selected) => confirmRemove(() => gManageEmployee.removeEmployees(selected))}
        callSearch={onSearch}
      />
    </SesameFloatingAdd>
  );
};

const ContactCards = ({ items, rows, query, onSearch }) => {
  const { gManageEmployee, gStripe } = useContext(GlobalStateContext);
  const floatingAddRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const masterDetail = useMasterDetail();
  const selectedUUID = masterDetail ? searchParams.get('uid') : null;
  // Dragging shows the new order before the server confirms it.
  const [ordered, setOrdered] = useState(null);
  useEffect(() => setOrdered(null), [items, query]);
  const contacts = ordered || rows;

  // The selection replaces the list's history entry, so back leaves the list as before.
  const selectContact = useCallback(
    (user) => {
      navigate(
        {
          pathname: PATHS.contacts,
          search: user ? createSearchParams({ uid: user.subUUID, email: user.employeeEmail }).toString() : '',
        },
        { replace: true }
      );
    },
    [navigate]
  );

  // Removed contacts can linger in the list until it refreshes; never pick one of them.
  const removedUUIDs = useRef([]);
  const firstContact = items.find((user) => !removedUUIDs.current.includes(user.subUUID));
  useEffect(() => {
    if (masterDetail && !selectedUUID && firstContact) selectContact(firstContact);
  }, [masterDetail, selectedUUID, firstContact?.subUUID]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (gStripe.isFromApp) gManageEmployee.getEmployees();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The old native APP opens the contact in its own WebView.
  const openInLegacyApp = (paramStr) => {
    const { protocol, host } = new URL(window.location.href);
    const scheme = `ssm://UI/webview/open?${new URLSearchParams({
      notifyName: 'FriendChanged',
      url: `${protocol}//${host}${PATHS.members.item}?${paramStr}`,
    })}`;
    biz3utils.triggerScheme(scheme);
  };

  const handleRowClick = (index) => {
    const user = contacts[index];
    if (masterDetail) {
      selectContact(user);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set('uid', user.subUUID);
    params.set('email', user.employeeEmail);
    if (gStripe.isFromApp) openInLegacyApp(params.toString());
    else navigate({ pathname: PATHS.members.item, search: params.toString() });
  };

  const list = (
    <SesameFloatingAdd
      ref={floatingAddRef}
      isMobile={!gStripe.isFromApp}
      fabSx={masterDetail ? fabInListSx : undefined}
      popupComponent={<AddPopup floatingAddRef={floatingAddRef} />}
    >
      <MobileContactList
        contacts={contacts}
        isEmpty={items.length === 0}
        callRowClick={handleRowClick}
        callSearch={onSearch}
        selectedUUID={selectedUUID}
        onDragEnd={
          query
            ? null
            : (newData) => {
                setOrdered(newData);
                gManageEmployee.reorderEmployees(
                  newData.map((item, index) => ({ friendUUID: item.subUUID, rank: -index })),
                  (response) => {
                    if (!response.success) gManageEmployee.getEmployees();
                  }
                );
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
