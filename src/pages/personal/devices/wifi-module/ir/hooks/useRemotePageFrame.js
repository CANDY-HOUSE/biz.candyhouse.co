import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { isAppHome } from '@/services/deviceService';

/**
 * 红外各页（品类列表、遥控器列表、遥控页、自动匹配页、自学习页）的页面外框：返回键和整页定位。
 *
 * @param {function} [beforeBack] 点返回键时、离开页面前先执行（如清掉搜索缓存）
 */
export const useRemotePageFrame = (beforeBack) => {
  const navigate = useNavigate();
  const { gMediaType } = useContext(GlobalStateContext);
  const showBack = isAppHome || !gMediaType.isMobile;
  const goBack = () => {
    beforeBack?.();
    if (isAppHome) window.dispatchEvent(new CustomEvent('app-back'));
    else navigate(-1);
  };
  const frameSx = isAppHome
    ? { position: 'fixed', inset: 0, height: 'auto', overflow: 'hidden', overscrollBehavior: 'none', p: 0 }
    : { overflowX: 'hidden', p: 0 };
  const contentSx = { px: '21px' };
  const scrollSx = { overflowX: 'hidden', overscrollBehaviorX: 'none', touchAction: 'pan-y' };
  return { showBack, goBack, frameSx, scrollSx, contentSx };
};
