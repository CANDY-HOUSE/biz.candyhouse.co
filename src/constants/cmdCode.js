/*  旧版 biz 的部分代码：
    - Sesame5 操作
        - 01 添加sesame设备 - 從STP發送到IoT
        - 02 删除sesame设备 - 從STP發送到IoT
        - 03 stp login sesame - 從STP發送到IoT
        { "op": "01", "s": "UUID( 36 bytes )" }
    - 卡片操作
        - 11: 上報卡片 - 從刷卡機添加（from STP to IoT）
        - 12: 上報刪除卡片 - 從刷卡機刪除（from STP to IoT）
        - 13: 修改卡片 - 從IoT發送到STP
        - 14: 插入卡片 - 從IoT發送到STP
        - 15: 刪除卡片 - 從IoT發送到STP
        - 18: 進入卡片錄入模式
        - 19: 進入卡片驗證模式
        - 6D: get cards list (from IoT to STP)  SSM_OS3_CARD_GET      = 109,  // 0x6D
        - B6: put cards list (from IoT to STP)  STP_ITEM_CODE_CARDS_ADD = 182,  // 0xB6

    - 指纹
        - 21 上报指纹  (刷卡机添加 from STP to IoT)
        - 22 删除指纹  (from STP to IoT)
        // - 23 修改指纹name  (only for name)
        // - 24 插入指纹 (from IoT to STP) do not support
        - 25 删除指纹 (from IoT to STP)
        - 28 進入指纹錄入模式  (from IoT to STP)
        - 29 進入指纹驗證模式  (from IoT to STP)

    - 密碼操作
        - 31: 上報密碼       - 從STP發送到IoT V
        - 32: 上報刪除密碼    - 從STP發送到IoT V
        - 33: 修改密碼       - 從IoT發送到STP
        - 34: 插入密碼       - 從IoT發送到STP V
        - 35: 刪除密碼       - 從IoT發送到STP V
        - 38: 進入密碼錄入模式    - 從IoT發送到STP V
        - 39: 進入密碼驗證模式    - 從IoT發送到STP V
        - 7D: get cards list (from IoT to STP)  SSM_OS3_PASSCODE_GET = 125, // 0x7D

    - 機械狀態
        - m: 上報機械狀態 - 從STP發送到IoT
        {"m":"c70c"}
        c70c: 3271 mV
    - Sesame Touch Pro Status
        - 183: 上報STP狀態 - 從STP發送到IoT

    Biz3: 尽量靠拢刷卡机的 BLE 代码 https://github.com/CANDY-HOUSE/SesameOS3_OM6621_2933/blob/master/external/candy/candy.h#L85
*/
export const cmdCode = {
  ssmOSUpdate: 0x03,
  cardPut: 14,
  cardDelete: 15,
  cardSet: 18,
  cardSetFinish: 19,
  fingerPut: 24,
  fingerDelete: 25,
  fingerSet: 28,
  fingerSetFinish: 29,
  passwordPut: 34,
  passwordDelete: 35,
  passwordSet: 38,
  passwordSetFinish: 39,
  SSM2_ITEM_CODE_MECH_STATUS: 81,
  HUB3_ITEM_CODE_LED_DUTY: 92,
  SSM3_ITEM_ADD_SESAME: 101,
  SSM3_ITEM_PUB_KEY_SESAME: 102,
  SSM3_ITEM_REMOVE_SESAME: 103,
  SSM_OS3_CARD_CHANGE: 107,
  SSM_OS3_CARD_DELETE: 108,
  SSM_OS3_CARD_GET: 109,
  SSM_OS3_CARD_NOTIFY: 110,
  SSM_OS3_CARD_LAST: 111,
  SSM_OS3_CARD_FIRST: 112,
  SSM_OS3_CARD_MODE_GET: 113,
  SSM_OS3_CARD_MODE_SET: 114,
  HUB3_MATTER_PAIRING_CODE: 137,
  SSM_OS3_CARD_ADD: 140,
  HUB3_MATTER_PAIRING_WINDOW: 153,
  STP_ITEM_CODE_CARDS_ADD: 182, // 0xB6
  STP_ITEM_CODE_CARDS_DELETE: 183, // 0xB7
  STP_ITEM_CODE_PASSCODES_ADD: 184,
  STP_ITEM_CODE_PASSCODES_DELETE: 185,
  STP_ITEM_CODE_PASSCODE_CHANGE_VALUE: 137,
  SSM_OS3_PASSCODE_CHANGE: 123,
  SSM_OS3_PASSCODE_DELETE: 124,
  SSM_OS3_PASSCODE_GET: 125,
  SSM_OS3_PASSCODE_NOTIFY: 126,
  SSM_OS3_PASSCODE_LAST: 127,
  SSM_OS3_PASSCODE_FIRST: 128,
  SSM_OS3_PASSCODE_MODE_GET: 129,
  SSM_OS3_PASSCODE_MODE_SET: 130,
  SSM_OS3_PASSCODE_ADD: 138,
  HUB3_ITEM_CODE_RELAY_SWITCH: 208,
  HUB3_ITEM_CODE_CLEAR_WIFI_SSID: 210,
};
