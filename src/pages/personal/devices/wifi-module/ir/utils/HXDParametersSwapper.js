// utils/HXDParametersSwapper.js
export class HXDParametersSwapper {
  // 获取当前按键指令
  getAirKey(type) {
    const keyMap = {
      POWER_STATUS_ON: 0x01,
      POWER_STATUS_OFF: 0x01,
      TEMP_CONTROL_ADD: 0x06,
      TEMP_CONTROL_REDUCE: 0x07,
      MODE: 0x02,
      FAN_SPEED: 0x03,
      WIND_DIRECTION: 0x04,
      AUTO_WIND_DIRECTION: 0x05,
    };

    return keyMap[type] || 0x01;
  }

  // 电源相关
  getPowerIndex(value) {
    return value === 0x01;
  }

  getPowerValue(isPowerOn) {
    return isPowerOn ? 0x01 : 0x00;
  }

  // 温度转换（暂不作转换）
  getTemperature(value) {
    return value;
  }

  // 模式转换
  getModeIndex(value) {
    const modeMap = {
      0x01: 0, // 自动
      0x02: 1, // 制冷
      0x03: 2, // 抽湿
      0x04: 3, // 送风
      0x05: 4, // 制热
    };
    return modeMap[value] || 0;
  }

  getModeValue(index) {
    const valueMap = {
      0: 0x01, // 自动
      1: 0x02, // 制冷
      2: 0x03, // 抽湿
      3: 0x04, // 送风
      4: 0x05, // 制热
    };
    return valueMap[index] || 0x01;
  }

  // 风速转换
  getFanSpeedIndex(value) {
    const speedMap = {
      0x01: 0, // 自动
      0x02: 1, // 低
      0x03: 2, // 中
      0x04: 3, // 高
    };
    return speedMap[value] || 0;
  }

  getFanSpeedValue(index) {
    const valueMap = {
      0: 0x01, // 自动
      1: 0x02, // 低
      2: 0x03, // 中
      3: 0x04, // 高
    };
    return valueMap[index] || 0x01;
  }

  // 风向转换
  getWindDirectionIndex(value) {
    const directionMap = {
      0x01: 0, // 向上
      0x02: 1, // 中
      0x03: 2, // 向下
    };
    return directionMap[value] || 0;
  }

  getWindDirectionValue(index) {
    const valueMap = {
      0: 0x01, // 向上
      1: 0x02, // 中
      2: 0x03, // 向下
    };
    return valueMap[index] || 0x02;
  }

  // 自动风向转换
  getAutoWindDirectionIndex(value) {
    const autoMap = {
      0x01: 0, // 打开
      0x00: 1, // 关闭
    };
    return autoMap[value] || 0;
  }

  getAutoWindDirectionValue(index) {
    const valueMap = {
      0: 0x01, // 打开
      1: 0x00, // 关闭
    };
    return valueMap[index] || 0x01;
  }

  // 获取灯光按键指令
  getLightKey(type) {
    const keyMap = {
      POWER_STATUS_ON: 0x01,
      POWER_STATUS_OFF: 0x02,
      MODE: 0x05,
      BRIGHTNESS_UP: 0x03,
      BRIGHTNESS_DOWN: 0x04,
      COLOR_TEMP_UP: 0x09,
      COLOR_TEMP_DOWN: 0x0a,
    };
    return keyMap[type] || 0x01;
  }

  // 获取电视按键指令
  getTVKey(type) {
    const keyMap = {
      POWER_STATUS_ON: 0x06,
      POWER_STATUS_OFF: 0x06,
      MUTE: 0x07,
      BACK: 0x14,
      UP: 0x16,
      MENU: 0x03,
      LEFT: 0x17,
      OK: 0x15,
      RIGHT: 0x18,
      VOLUME_UP: 0x05,
      DOWN: 0x19,
      CHANNEL_UP: 0x02,
      VOLUME_DOWN: 0x01,
      HOME: 0x1a,
      CHANNEL_DOWN: 0x04,
    };
    return keyMap[type] || 0x01;
  }

  // 获取风扇按键指令
  getFanKey(type) {
    const keyMap = {
      POWER_STATUS_ON: 0x01,
      POWER_STATUS_OFF: 0x01,
      FAN_SPEED: 0x02,
      SHAKE_HEAD: 0x03,
      MODE: 0x04,
      LOW: 0x14,
      MIDDLE: 0x15,
      HIGH: 0x16,
    };
    return keyMap[type] || 0x01;
  }

  // 根据设备类型获取对应的按键指令

  getKeyByDeviceType(irType, type) {
    switch (irType) {
      case 0xc000:
        return this.getAirKey(type);
      case 0xe000:
        return this.getLightKey(type);
      case 0x2000:
        return this.getTVKey(type);
      case 0x8000:
        return this.getFanKey(type);
      default:
        console.warn(`Unknown device type: ${irType}`);
        return 0x01;
    }
  }

  // 根据设备类型获取对应的按键指令
  getPowerOnKeyByDeviceType(irType) {
    switch (irType) {
      case 0xc000: // 空调
        return this.getAirKey('POWER_STATUS_ON');
      case 0xe000: // 灯光
        return this.getLightKey('POWER_STATUS_ON');
      case 0x2000: // 电视
        return this.getTVKey('POWER_STATUS_ON');
      case 0x8000: // 风扇
        return this.getFanKey('POWER_STATUS_ON');
      default:
        console.warn(`Unknown device type: ${irType}`);
        return 0x01;
    }
  }

  // 根据设备类型获取关机按键指令
  getPowerOffKeyByDeviceType(irType) {
    switch (irType) {
      case 0xc000: // 空调
        return this.getAirKey('POWER_STATUS_OFF');
      case 0xe000: // 灯光
        return this.getLightKey('POWER_STATUS_OFF');
      case 0x2000: // 电视
        return this.getTVKey('POWER_STATUS_OFF');
      case 0x8000: // 风扇
        return this.getFanKey('POWER_STATUS_OFF');
      default:
        console.warn(`Unknown device type: ${irType}`);
        return 0x01;
    }
  }

  /**
   * 将解析出的命令状态转换为界面状态
   * @param {Object} parsedState - 从命令解析出的状态
   * @returns {Object} 界面状态对象
   */
  convertToUIState(parsedState) {
    if (!parsedState) {
      return null;
    }

    try {
      const uiState = {
        power: parsedState.power === 0x01,
        temperature: parsedState.temperature,
        mode: this.getModeIndex(parsedState.mode),
        fanSpeed: this.getFanSpeedIndex(parsedState.fanSpeed),
        windDirection: this.getWindDirectionIndex(parsedState.windDirection),
        autoSwing: parsedState.autoWindDirection === 0x01,
      };

      console.log('Converted to UI state:', uiState);
      return uiState;
    } catch (error) {
      console.error('Error converting to UI state:', error);
      return null;
    }
  }
}
