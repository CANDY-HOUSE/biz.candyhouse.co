import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket, sendMessage } from '@hooks/useWebSocket.ts';
import { ACTION_TYPES } from '@constants/messageConstants.js';
import { useCallbacks } from '../hooks/useCallbacks.js';
import { gUtils } from '@/utils/gUtils.js';
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
  const [levelInfo, setLevelInfo] = useState({});
  const [isOwner, setIsOwner] = useState(false);
  const [companies, setCompanies] = useState([]);
  const { registerCallback, invokeCallbacks } = useCallbacks();

  // Helper function to process tags and set access permissions
  const newTags = useCallback((res) => {
    if (!res) return res;
    if (res.tag && res.tag.length > 0) {
      if (res.tag[0] === 'オーナー' || res.tag[0] === 'マネージャー') {
        return { ...res, access: gUtils.allTags };
      }
    }
    return res;
  }, []);

  // Check if user is owner based on tag
  const isOwnerByTag = useCallback((tag) => {
    try {
      if (tag && tag[0] === 'オーナー') {
        // Owner
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }
    } catch (e) {
      setIsOwner(false);
    }
  }, []);

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

  // 处理从 AWS API Gateway Hub3WebSocketAPI 响应的消息
  const handleBiz3GetCustomerInfoResponse = useCallback(
    (message) => {
      if (message.action === ACTION_TYPES.BIZ3_GET_LOGIN_INFO) {
        setIsPending(false);
        let customerInfoData = message.data.customerInfo;
        customerInfoData = newTags(customerInfoData);
        setCustomerInfo(customerInfoData);
        setLevelInfo(message.data.feeLevel);
        localStorage.setItem('curLogin', customerInfoData.companyID);
        isOwnerByTag(customerInfoData.tag);
        getCompanies();
      }
    },
    [newTags, isOwnerByTag, getCompanies]
  );

  const getCardList = useCallback(() => {
    const customerId = customerInfo.companyID;
    if (!customerId) return;
    const msgData = {
      action: ACTION_TYPES.BIZ3_MANAGE_PAYMENT,
      customerId,
      op: 'getPaymentMethods',
    };
    sendMessage(msgData);
  }, [customerInfo.companyID]);

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
            const data = message.data;
            if (data.subId) {
              setCustomerInfo((prevState) => ({
                ...prevState,
                subscriptionId: data.subId,
              }));
            }
            setLevelInfo(data);
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
      switch (message.op) {
        case 'get':
          if (message.success) {
            setCompanies(message.data);
          }
          break;
        case 'updateName':
          invokeCallbacks(message);
          if (message.success) {
            setCompanies((prevCompanies) =>
              prevCompanies.map((company) =>
                company.companyID === message.data.companyID ? { ...company, name: message.data.name } : company
              )
            );
          }
          break;
        case 'add':
          invokeCallbacks(message);
          if (message.success) {
            setCompanies((prevState) => [...prevState, message.data]);
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
    [customerInfo.subscriptionId, customerInfo.companyID, registerCallback]
  );

  const getClientSecret = useCallback(
    (cb) => {
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
    [customerInfo.companyID, registerCallback]
  );

  const changeDefaultPay = useCallback(
    (defaultPaymentMethod, cb) => {
      const customerId = customerInfo.companyID;
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_PAYMENT,
        customerId,
        defaultPaymentMethod,
        op: 'changeDefaultPayment',
      };
      sendMessage(msgData);
      registerCallback(msgData.action, msgData.op, cb);
    },
    [customerInfo.companyID, registerCallback]
  );

  const delCard = useCallback(
    (paymentId) => {
      const customerId = customerInfo.companyID;
      const msgData = {
        action: ACTION_TYPES.BIZ3_MANAGE_PAYMENT,
        paymentId,
        customerId,
        op: 'removePayment',
      };
      sendMessage(msgData);
    },
    [customerInfo.companyID]
  );

  const getCustomerInfo = useCallback(
    (email) => {
      biz3GetCustomerInfo(email);
    },
    [biz3GetCustomerInfo]
  );

  const getDevApiInfo = useCallback(
    (isUpdate = null) => {
      const customerId = customerInfo.companyID;
      const email = customerInfo.employeeEmail;
      if (!customerId) return;
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
    [customerInfo.companyID, customerInfo.employeeEmail]
  );

  const updateCompanyName = useCallback(
    (name, cb) => {
      const companyID = localStorage.getItem('curLogin');
      const message = {
        action: ACTION_TYPES.BIZ3_MANAGE_COMPANY,
        obj: { companyID, name },
        op: 'updateName',
      };
      sendMessage(message);
      registerCallback(message.action, message.op, cb);
    },
    [registerCallback]
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
    levelInfo,
    updateLevel,
    getDevApiInfo,
    apiKey,

    isOwner,
    addCompany,
    companies,
    getCompanies,
    updateCompanyName,
  };
};
