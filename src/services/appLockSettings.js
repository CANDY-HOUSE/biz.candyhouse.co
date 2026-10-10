// Lock-only settings; Bot and Bike share some legacy list routing but have different controls.
export const isAppLockModel = (model) =>
  [
    'sesame_2',
    'sesame_4',
    'sesame_5',
    'sesame_5_pro',
    'sesame_5_us',
    'sesame_6',
    'sesame_6_pro',
    'sesame_6_pro_slidingdoor',
    'BLE_Connector_1',
    'sesame_miwa',
  ].includes(model);
