const iotCallbackRegistry = {};

export const registerIotCallback = (op, callback) => {
  iotCallbackRegistry[op] = callback; // 直接替换为新的回调函数
};

export const unregisterIotCallback = (op) => {
  delete iotCallbackRegistry[op];
};

export const getIotCallbacks = (op) => {
  return iotCallbackRegistry[op] || null; // 返回单个回调函数或 null
};
