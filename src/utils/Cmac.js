const const_Zero = new Uint8Array(16);
const const_Rb = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x87]);
const const_blockSize = 16;

const bitShiftLeft = function (buffer) {
  let shifted = new Uint8Array(buffer.length);
  let last = buffer.length - 1;
  for (let index = 0; index < last; index++) {
    shifted[index] = buffer[index] << 1;
    if (buffer[index + 1] & 0x80) {
      shifted[index] += 0x01;
    }
  }
  shifted[last] = buffer[last] << 1;
  return shifted;
};

const xor = function (bufferA, bufferB) {
  let length = Math.min(bufferA.length, bufferB.length);
  let output = new Uint8Array(length);
  for (let index = 0; index < length; index++) {
    output[index] = bufferA[index] ^ bufferB[index];
  }
  return output;
};

const generateSubkeys = async function (key) {
  let l = await aes(key, const_Zero); // aes 函数需要是异步的

  let subkey1 = bitShiftLeft(l);
  if (l[0] & 0x80) {
    subkey1 = xor(subkey1, const_Rb);
  }

  let subkey2 = bitShiftLeft(subkey1);
  if (subkey1[0] & 0x80) {
    subkey2 = xor(subkey2, const_Rb);
  }

  return { subkey1: subkey1, subkey2: subkey2 };
};

function getMessageBlock(message, blockIndex) {
  let block = new Uint8Array(const_blockSize);
  let start = blockIndex * const_blockSize;
  let end = start + const_blockSize;

  block.set(message.slice(start, end));

  return block;
}

function getPaddedMessageBlock(message, blockIndex) {
  let block = new Uint8Array(const_blockSize);
  let start = blockIndex * const_blockSize;
  let end = message.length;

  block.fill(0);
  block.set(message.slice(start, end), 0);
  if (end - start < const_blockSize) {
    block[end - start] = 0x80;
  }

  return block;
}

async function aes(keyBuffer, messageBuffer) {
  const iv = new Uint8Array(16);
  // 防止在不支持 Web Crypto API 的环境中出错
  if (window.crypto === undefined || window.crypto.subtle === undefined) {
    return iv;
  }
  // 导入密钥
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-CBC', length: keyBuffer.byteLength * 8 },
    false,
    ['encrypt']
  );
  let algorithm = { name: 'AES-CBC', iv: iv };
  if (messageBuffer.byteLength % 16 === 0) {
    algorithm = { ...algorithm, padding: 'None' }; // Web Crypto API 不支持关闭填充的选项
  }
  // 加密消息
  const encrypted = await window.crypto.subtle.encrypt(algorithm, cryptoKey, messageBuffer);
  let encryptedBytes = new Uint8Array(encrypted);
  if (encryptedBytes.byteLength !== keyBuffer.byteLength) {
    encryptedBytes = encryptedBytes.slice(0, keyBuffer.byteLength);
  }
  return new Uint8Array(encryptedBytes);
}
function hexStringToUint8Array(hexString) {
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hexString');
  }
  const arrayBuffer = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    const byteValue = parseInt(hexString.substring(i, i + 2), 16);
    arrayBuffer[i / 2] = byteValue;
  }
  return arrayBuffer;
}

// 将 Uint8Array 转换为十六进制字符串
function uint8ArrayToHexString(arrayBuffer) {
  return Array.from(arrayBuffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const aesCmac = async function (hexkey, message) {
  const key = hexStringToUint8Array(hexkey);
  let subkeys = await generateSubkeys(key);
  let blockCount = Math.ceil(message.length / const_blockSize);
  let lastBlockCompleteFlag, lastBlock, lastBlockIndex;
  if (blockCount === 0) {
    blockCount = 1;
    lastBlockCompleteFlag = false;
  } else {
    lastBlockCompleteFlag = message.length % const_blockSize === 0;
  }
  lastBlockIndex = blockCount - 1;
  if (lastBlockCompleteFlag) {
    lastBlock = xor(getMessageBlock(message, lastBlockIndex), subkeys.subkey1);
  } else {
    lastBlock = xor(getPaddedMessageBlock(message, lastBlockIndex), subkeys.subkey2);
  }

  let x = new Uint8Array(16);
  let y;

  for (let index = 0; index < lastBlockIndex; index++) {
    y = xor(x, getMessageBlock(message, index));
    x = await aes(key, y);
  }
  y = xor(lastBlock, x);
  let result = await aes(key, y);
  return uint8ArrayToHexString(result).substring(0, 8);
};

async function cmacTime(key) {
  const date = Math.floor(Date.now() / 1000);
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, date, true); // true 表示使用 little-endian 字节序
  const fullMessage = new Uint8Array(buffer);
  const message = fullMessage.slice(1, 4); // 截取索引1到3的字节
  return await aesCmac(key, message);
}

export const Cmac = {
  cmacTime,
};
