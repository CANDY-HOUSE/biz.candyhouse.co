// utils/HXDCommandProcessor.js
export class HXDCommandProcessor {
  constructor() {
    this.power = 0x00;
    this.temperature = 25;
    this.fanSpeed = 0x01;
    this.windDirection = 0x02;
    this.autoWindDirection = 0x01;
    this.mode = 0x02;
    this.key = 0x01;
    this.code = 0x00;
    this.defaultTable = [0, 0, 0];
    this.AirPrefixCode = [0x30, 0x01];
    this.commonPrefixCode = [0x30, 0x00];
  }

  buildAirCommand() {
    const buf = this.buildKeyData(this.AirPrefixCode, this.code, this.defaultTable);
    buf[4] = this.temperature;
    buf[5] = this.fanSpeed;
    buf[6] = this.windDirection;
    buf[7] = this.autoWindDirection;
    buf[8] = this.power;
    buf[9] = this.key;
    buf[10] = this.mode;
    buf[buf.length - 2] = 0xff;

    // 计算校验和
    const checkSum = buf.slice(0, -1).reduce((sum, byte) => sum + byte, 0);
    buf[buf.length - 1] = checkSum & 0xff;

    console.log('buildAirCommand:', this.toHexString(buf));
    return buf;
  }

  buildNonAirCommand() {
    const buf = this.buildKeyData(this.commonPrefixCode, this.code, this.defaultTable);
    buf[9] = this.key;
    buf[buf.length - 2] = 0xff;

    // 计算校验和
    const checkSum = buf.slice(0, -1).reduce((sum, byte) => sum + byte, 0);
    buf[buf.length - 1] = checkSum & 0xff;

    console.log('buildNonAirCommand:', this.toHexString(buf));
    return buf;
  }

  buildKeyData(prefixCodeArray, code, table) {
    const indexTable = [...table];
    const buf = [];

    // 添加前缀
    buf.push(...prefixCodeArray);

    // 添加代码
    const [firstPart, secondPart] = this.decimalToTwoHexInts(code);
    buf.push(firstPart, secondPart);

    // 添加7个0
    buf.push(...new Array(7).fill(0));

    // 更新索引表
    indexTable[0] = (table[0] + 1) & 0xff;
    buf.push(...indexTable);

    // 添加结束标记
    buf.push(0xff, 0);

    return buf;
  }

  decimalToTwoHexInts(number) {
    const firstPart = Math.floor(number / 256);
    const secondPart = number % 256;
    return [firstPart, secondPart];
  }

  /**
   * 从十六进制字符串解析空调状态
   * @param {string} hexString - 十六进制命令字符串
   * @returns {Object} 解析出的状态对象
   */
  parseAirCommand(hexString) {
    try {
      if (!hexString || hexString.length < 22) {
        console.warn('Invalid hex string for parsing:', hexString);
        return null;
      }

      // 将十六进制字符串转换为字节数组
      const bytes = this.hexStringToByteArray(hexString);

      // 检查是否为空调命令（前缀应该是 0x30, 0x01）
      if (bytes.length < 11 || bytes[0] !== 0x30 || bytes[1] !== 0x01) {
        console.warn('Not a valid air conditioner command:', hexString);
        return null;
      }

      // 解析各个字段
      const parsedState = {
        temperature: bytes[4],
        fanSpeed: bytes[5],
        windDirection: bytes[6],
        autoWindDirection: bytes[7],
        power: bytes[8],
        key: bytes[9],
        mode: bytes[10],
      };

      console.log('Parsed air command:', parsedState);
      return parsedState;
    } catch (error) {
      console.error('Error parsing air command:', error);
      return null;
    }
  }

  /**
   * 将十六进制字符串转换为字节数组
   * @param {string} hexString - 十六进制字符串
   * @returns {Array} 字节数组
   */
  hexStringToByteArray(hexString) {
    const result = [];
    for (let i = 0; i < hexString.length; i += 2) {
      result.push(parseInt(hexString.substr(i, 2), 16));
    }
    return result;
  }

  toHexString(byteArray) {
    return byteArray.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  // Setter methods
  setPower(power) {
    this.power = power;
    return this;
  }

  setTemperature(temperature) {
    this.temperature = temperature;
    return this;
  }

  setModel(model) {
    this.mode = model;
    return this;
  }

  setFanSpeed(fanSpeed) {
    this.fanSpeed = fanSpeed;
    return this;
  }

  setWindDirection(windDirection) {
    this.windDirection = windDirection;
    return this;
  }

  setAutoWindDirection(autoWindDirection) {
    this.autoWindDirection = autoWindDirection;
    return this;
  }

  setKey(key) {
    this.key = key;
    return this;
  }

  setCode(code) {
    this.code = code;
    return this;
  }

  // Getter methods
  getPower() {
    return this.power;
  }
  getTemperature() {
    return this.temperature;
  }
  getModel() {
    return this.mode;
  }
  getFanSpeed() {
    return this.fanSpeed;
  }
  getWindDirection() {
    return this.windDirection;
  }
  getAutoDirection() {
    return this.autoWindDirection;
  }
  getKey() {
    return this.key;
  }
  getCode() {
    return this.code;
  }
}
