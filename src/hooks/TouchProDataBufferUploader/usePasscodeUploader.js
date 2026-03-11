import { Buffer } from 'buffer';
import { gConfig } from '@constants/gConfig';
import useItemUploader from './useItemUploader';

const usePasscodeUploader = (sendCmd) => {
  const config = {
    cmdCode: gConfig.cmdCode.STP_ITEM_CODE_PASSCODES_ADD,
    logPrefix: 'passwordUploader',
    prepareData: (passwordsList) => {
      console.log('[passwordUploader] Preparing password data for upload:', passwordsList);
      let totalLength = 0;
      for (const item of passwordsList) {
        totalLength += 1 + Buffer.from(item.passwordID, 'hex').length + 1 + Buffer.from(item.nameUUID, 'utf8').length;
      }
      console.log('[passwordUploader] Total length of passwords data:', totalLength);
      const dataBuffer = new Uint8Array(totalLength);
      let dataIndex = 0;
      for (const item of passwordsList) {
        const passwordLength = Math.ceil(item.passwordID.length / 2);
        dataBuffer[dataIndex++] = passwordLength;
        dataBuffer.set(Buffer.from(item.passwordID, 'hex'), dataIndex);
        dataIndex += passwordLength;
        const nameUUID = Buffer.from(item.nameUUID, 'utf8');
        dataBuffer[dataIndex++] = nameUUID.length;
        dataBuffer.set(nameUUID, dataIndex);
        dataIndex += nameUUID.length;
      }
      console.log('[passwordUploader] Password IDs processed, current index:', dataIndex, 'total length:', totalLength);
      return dataBuffer;
    },
  };
  const { uploadItemBatch, uploadState } = useItemUploader(sendCmd, config);
  return {
    uploadPasswordBatch: uploadItemBatch,
    uploadState,
  };
};

export default usePasscodeUploader;
