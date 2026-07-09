import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import { ACTION_TYPES } from '@constants/messageConstants.js';
import { useCallbacks } from '../hooks/useCallbacks.js';
import { gUtils } from '@/utils/gUtils.js';
import { collectEnvInfo, ensureIdentifyId, isEnvReportEnabled } from '@/utils/envIdentity.js';
import { useSearchParams } from 'react-router-dom';

const INIT_CUSTOMER = {
  name: '',
  companyID: '',
  id: null,
  invoice_settings: { default_payment_method: null },
  access: [],
  tag: [],
};
export const useStripeInfo = (gAuth) => {
  const [searchParams] = useSearchParams();
  const isFromApp = searchParams.get('fromType') === 'app';
  const [isPending, setIsPending] = useState(true);
  const [customerInfo, setCustomerInfo] = useState(INIT_CUSTOMER);
  const [apiKey, setApiKey] = useState({ apiKeyValue: '', apiKeyId: '', usedCount: 0 });
  const [cardList, setCardList] = useState([]);
  const [quotas, setQuotasInfo] = useState({});
  const [companies, setCompanies] = useState([]);
  const { registerCallback, invokeCallbacks } = useCallbacks();

  // Helper function to process tags and set access permissions
  const newTags = useCallback((res) => {
    if (!res) return res;
    if (res.isSesameApp) {
      return { ...res, access: [...res.access, gUtils.pageNames.developer] };
    }
    if (res.tag && res.tag.length > 0) {
      if (res.tag[0] === 'オーナー' || res.tag[0] === 'マネージャー') {
        return { ...res, access: gUtils.allTags };
      }
    }
    return res;
  }, []);

  const priorityCompany = useMemo(() => {
    if (!customerInfo.isSesameApp) {
      const target = companies.find((company) => company.companyID === customerInfo.companyID);
      return {
        ...customerInfo,
        subscriptionId: target?.feeLevel?.subscriptionId,
      };
    }
    if (companies.length === 0) return {};
    const rootUser = companies.find((company) => company.feeLevel?.isRootUser === true);
    if (rootUser)
      return {
        ...rootUser,
        ...rootUser.feeLevel,
      };
    const maxLevelUser = companies
      .filter((c) => !c.isSesameApp)
      .reduce((max, c) => (!max || c.feeLevel?.level > max.feeLevel?.level ? c : max), null);
    return {
      ...maxLevelUser,
      ...maxLevelUser.feeLevel,
    };
  }, [companies, customerInfo]);

  const priorityCompanyId = useMemo(() => {
    return priorityCompany?.companyID ?? null;
  }, [priorityCompany]);

  const isOwner = useMemo(() => {
    return priorityCompany?.tag && priorityCompany.tag[0] === 'オーナー';
  }, [priorityCompany]);

  const getCompanies = useCallback(() => {
    if (isFromApp) {
      return;
    }
    const message = {
      action: ACTION_TYPES.BIZ3_MANAGE_COMPANY,
      op: 'get',
    };
    sendMessage(message);
  }, [isFromApp]);

  // 上报 web 环境信息，后端据此维护账户的 envId 与最近登录列表（仅正式域名）
  const reportEnv = useCallback(async () => {
    if (isFromApp || !isEnvReportEnabled()) return;
    sendMessage({
      action: ACTION_TYPES.BIZ3_MANAGE_EMPLOYEE,
      op: 'reportEnv',
      appIdentifyId: await ensureIdentifyId(),
      env: collectEnvInfo(),
    });
  }, [isFromApp]);

  // 处理从 AWS API Gateway Hub3WebSocketAPI 响应的消息
  const handleBiz3GetCustomerInfoResponse = useCallback(
    (message) => {
      if (message.action === ACTION_TYPES.BIZ3_GET_LOGIN_INFO) {
        setIsPending(false);
        let customerInfoData = message.data.customerInfo;
        customerInfoData = newTags(customerInfoData);
        setCustomerInfo(customerInfoData);
        setQuotasInfo(message.data.quotas);
        localStorage.setItem('curLogin', customerInfoData.companyID);
        getCompanies();
        reportEnv(); // 拿到用户信息后再上报环境信息
      }
    },
    [newTags, getCompanies, reportEnv]
  );

  const getCardList = useCallback(() => {
    const customerId = priorityCompanyId;
    if (!customerId) return;
    const msgData = {
      action: ACTION_TYPES.BIZ3_MANAGE_PAYMENT,
      customerId,
      op: 'getPaymentMethods',
    };
    sendMessage(msgData);
  }, [priorityCompanyId]);

  const handlePaymentResponse = useCallback(
    (message) => {
      invokeCallbacks(message);
      if (message.action === ACTION_TYPES.BIZ3_MANAGE_PAYMENT) {
        switch (message.op) {
          case 'getDevApiInfo':
            if (!message.success) return;
            const { apiKeyValue, apiKeyId, usedCount } = message.data;
            setApiKey({ apiKeyValue, apiKeyId, usedCount });
            break;
          case 'getClientSecret':
            break;
          case 'changeDefaultPayment':
            const isFind = cardList.find((item) => item.id === message.reqContext.defaultPaymentMethod);
            if (isFind) {
              setCardList((prevState) =>
                prevState.map((item) => ({
                  ...item,
                  isDefaultPay: item.id === message.reqContext.defaultPaymentMethod,
                }))
              );
            } else {
              getCardList();
            }
            break;
          case 'getPaymentMethods':
          case 'removePayment':
            setCardList(message.data);
            break;
          case 'payUpdateLevel':
            if (!message.success) {
              return;
            }
            setTimeout(() => {
              window.location.reload();
            }, 200);
            break;
          default:
            break;
        }
      }
    },
    [cardList, getCardList, invokeCallbacks]
  );

  const handleCompaniesResponse = useCallback(
    (message) => {
      if (message.action !== ACTION_TYPES.BIZ3_MANAGE_COMPANY) return;
      invokeCallbacks(message);
      switch (message.op) {
        case 'get':
          if (message.success) {
            setCompanies(message.data);
          }
          break;
        case 'updateName':
          if (message.success) {
            setCompanies((prevCompanies) =>
              prevCompanies.map((company) =>
                company.companyID === message.data.companyID ? { ...company, name: message.data.name } : company
              )
            );
          }
          break;
        case 'add':
          if (message.success) {
            setCompanies((prevState) => [...prevState, message.data]);
          }
          break;
        case 'delete':
          if (message.success) {
            const { deletedCompanyId, curCompanyID } = message.data || {};
            setCompanies((prevState) => prevState.filter((company) => company.companyID !== deletedCompanyId));
            if (curCompanyID) {
              localStorage.setItem('curLogin', curCompanyID);
              getCustomerInfo(curCompanyID);
            }
          }
          break;
        default:
          break;
      }
    },
    [invokeCallbacks]
  );

  useWebSocket(ACTION_TYPES.BIZ3_GET_LOGIN_INFO, handleBiz3GetCustomerInfoResponse);
  useWebSocket(ACTION_TYPES.BIZ3_MANAGE_PAYMENT, handlePaymentResponse);
  useWebSocket(ACTION_TYPES.BIZ3_MANAGE_COMPANY, handleCompaniesResponse);

  const biz3GetCustomerInfo = useCallback((email) => {
    const message = {
      action: ACTION_TYPES.BIZ3_GET_LOGIN_INFO,
      email,
    };
    sendMessage(message);
    setIsPending(true);
  }, []);

  const updateLevel = useCallback(
    ({ level, isUpgrade, isCancel = false, cb }) => {
      const customerInfo = priorityCompany;
      const subId = customerInfo.subscriptionId;
      const customerId = customerInfo.companyID;
      if (!customerId) return;
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_PAYMENT,
        subId,
        isUpgrade,
        level,
        isCancel,
        customerId,
        op: 'payUpdateLevel',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [priorityCompany, registerCallback]
  );

  const getClientSecret = useCallback(
    (cb) => {
      const customerInfo = priorityCompany;
      const customerId = customerInfo.companyID;
      if (!customerId) return;
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_PAYMENT,
        customerId,
        op: 'getClientSecret',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [priorityCompany, registerCallback]
  );

  const changeDefaultPay = useCallback(
    (defaultPaymentMethod, cb) => {
      const customerId = priorityCompany.companyID;
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_PAYMENT,
        customerId,
        defaultPaymentMethod,
        op: 'changeDefaultPayment',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [priorityCompany, registerCallback]
  );

  const delCard = useCallback(
    (paymentId) => {
      const customerId = priorityCompany.companyID;
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_PAYMENT,
        paymentId,
        customerId,
        op: 'removePayment',
      };
      sendMessage(msgData);
    },
    [priorityCompany]
  );

  const getCustomerInfo = useCallback(
    (email) => {
      biz3GetCustomerInfo(email);
    },
    [biz3GetCustomerInfo]
  );

  const getDevApiInfo = useCallback(
    (isUpdate = null) => {
      const customerId = priorityCompanyId;
      if (!customerId) return;
      const email = priorityCompany.employeeEmail;
      if (!email) return;
      let msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_PAYMENT,
        customerId,
        email,
        op: 'getDevApiInfo',
      };
      if (isUpdate !== null) {
        msgData = { ...msgData, update: isUpdate };
      }
      sendMessage(msgData);
    },
    [priorityCompanyId, customerInfo.employeeEmail]
  );

  const updateCompanyName = useCallback(
    (name, cb) => {
      const companyID = priorityCompanyId;
      const message = {
        action: ACTION_TYPES.BIZ3_MANAGE_COMPANY,
        obj: { companyID, name },
        op: 'updateName',
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [registerCallback, priorityCompanyId]
  );

  const addCompany = useCallback(
    (name, employeeEmail, subUUID, cb) => {
      const message = {
        action: ACTION_TYPES.BIZ3_MANAGE_COMPANY,
        name,
        employeeEmail,
        subUUID,
        op: 'add',
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [registerCallback]
  );

  const deleteCompany = useCallback(
    (cb) => {
      const message = {
        action: ACTION_TYPES.BIZ3_MANAGE_COMPANY,
        companyID: priorityCompanyId,
        op: 'delete',
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [registerCallback, priorityCompanyId]
  );

  const getLevelConfig = useCallback(
    (cb) => {
      const customerId = priorityCompanyId;
      const message = {
        action: ACTION_TYPES.BIZ3_MANAGE_COMPANY,
        companyID: customerId,
        op: 'getPaymentConfig',
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [priorityCompanyId, registerCallback]
  );

  const reset = () => {
    setCustomerInfo(INIT_CUSTOMER);
    setIsPending(false);
  };

  useEffect(() => {
    if (gAuth.loginState === 'signOut') {
      reset();
    }
  }, [gAuth.loginState]);

  return {
    isFromApp,
    customerInfo,
    setCustomerInfo,
    getCustomerInfo,
    isPending,
    getClientSecret,

    cardList,
    getCardList,
    delCard,
    changeDefaultPay,
    quotas,
    updateLevel,
    getLevelConfig,
    getDevApiInfo,
    apiKey,

    isOwner,
    addCompany,
    deleteCompany,
    companies,
    getCompanies,
    updateCompanyName,
    priorityCompany,
  };
};
