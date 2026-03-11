import { Buffer } from 'buffer';
import { gConfig } from '@constants/gConfig';
import useItemUploader from './useItemUploader';

const useNfcCardUploader = (sendCmd) => {
  const config = {
    cmdCode: gConfig.cmdCode.STP_ITEM_CODE_CARDS_ADD,
    prepareData: (cardsList) => {
      let totalLength = 0;
      for (const item of cardsList) {
        totalLength += 1 + Buffer.from(item.cardID, 'hex').length + 1 + Buffer.from(item.nameUUID, 'utf8').length;
      }
      const dataBuffer = new Uint8Array(totalLength);
      let dataIndex = 0;
      for (const item of cardsList) {
        const cardIDLength = Math.ceil(item.cardID.length / 2);
        dataBuffer[dataIndex++] = cardIDLength;
        const cardID = Buffer.from(item.cardID, 'hex');
        dataBuffer.set(cardID, dataIndex);
        dataIndex += cardIDLength;

        const nameUUID = Buffer.from(item.nameUUID, 'utf8');
        dataBuffer[dataIndex++] = nameUUID.length;
        dataBuffer.set(nameUUID, dataIndex);
        dataIndex += nameUUID.length;
      }
      return dataBuffer;
    },
  };
  const { uploadItemBatch, uploadState } = useItemUploader(sendCmd, config);
  return {
    uploadCardBatch: uploadItemBatch,
    uploadState,
  };
};

export default useNfcCardUploader;
