import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * 自定义 hook，用于判断当前设备类型
 * @returns {Object} 包含设备类型判断的对象
 */
export function useMediaType() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  return {
    isMobile,
    isTablet,
    isDesktop,
  };
}
