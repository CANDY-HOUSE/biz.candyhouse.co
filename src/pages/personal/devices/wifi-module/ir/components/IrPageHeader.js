import React, { useContext } from 'react';
import { Box, Typography } from '@mui/material';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { isAppHome } from '@/services/deviceService';

// 可编辑名称（EditableText）的样式：和 App 其他页面标题（主题 h3，实际 18px / 700）一样。
// 用 px 不用 em（EditableText 会把 em 再乘一次）；字重写死 700（bolder 是相对外层算的，放进输入框会变成 900）
export const IR_TITLE_STYLE = {
  fontSize: '18px',
  fontWeight: 700,
  lineHeight: '1.3',
  color: 'black',
  width: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

/**
 * 红外各页（品类列表、遥控器列表、遥控页、自动匹配页、自学习页）的标题行。
 * 用 App 公共的 PageHeader。
 * @param {React.ReactNode} p.title     字符串按 h3 显示；也可以传元素（如 EditableText，样式用 IR_TITLE_STYLE）
 * @param {boolean}  p.showBack  useRemotePageFrame 的 showBack
 * @param {function} p.onBack    useRemotePageFrame 的 goBack
 * @param {React.ReactNode} [p.action] 右侧按钮（如 ⊕、保存）
 */
const IrPageHeader = ({ title, showBack, onBack, action }) => {
  const { gMediaType } = useContext(GlobalStateContext);
  const isMobile = gMediaType.isMobile;
  const arrowGap = isAppHome ? 12 : 16;
  const titleNode = React.isValidElement(title) ? (
    title
  ) : (
    <Typography variant="h3" noWrap sx={{ color: 'black' }}>
      {title}
    </Typography>
  );
  return (
    <PageHeader sx={{ position: 'static', pl: isMobile ? 0 : 4, pr: isMobile ? 1 : 4 }}>
      {showBack && (
        <BackButton
          onClick={onBack}
          disableRipple
          sx={{ flexShrink: 0, justifyContent: isAppHome ? 'center' : 'flex-start' }}
        />
      )}
      <Box sx={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden', ml: showBack ? `-${arrowGap}px` : 2, mr: 1 }}>
        {titleNode}
      </Box>
      {action && <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{action}</Box>}
    </PageHeader>
  );
};

export default IrPageHeader;
