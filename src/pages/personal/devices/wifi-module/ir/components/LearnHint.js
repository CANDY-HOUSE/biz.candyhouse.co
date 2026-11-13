import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import { useTranslation } from 'react-i18next';

/**
 * 学习新按键的说明（和自学习页同一段文案 learnInstruction），在标题栏下单独一行、白底。
 * 文案里的「⊕」换成和右上角一样的图标，点它也能进入学习模式。
 *
 * @param {'left'|'right'} p.align  right：网页版靠右对齐，文字结尾落在右上角 ⊕ 的下方；left：手机版
 * @param {function}       p.onAdd  点文字里的 ⊕ 时调用（进入学习模式）
 */
const LearnHint = ({ align = 'left', onAdd }) => {
  const { t } = useTranslation();
  const text = t('pages.ir.remote.learnInstruction');
  const index = text.indexOf('⊕');

  const content =
    index < 0 ? (
      text
    ) : (
      <>
        {text.slice(0, index)}
        <IconButton
          size="small"
          onClick={onAdd}
          aria-label="learn"
          sx={{ p: 0.25, mx: 0.25, verticalAlign: 'middle', color: 'action.active' }}
        >
          <AddCircleOutlineOutlinedIcon sx={{ fontSize: '1.25em' }} />
        </IconButton>
        {text.slice(index + 1)}
      </>
    );

  return (
    <Box
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        flexShrink: 0,
        backgroundColor: 'background.paper',
        // 上方不留白、贴近标题栏的 ⊕（不用负边距：内容区会把伸出顶部的部分裁掉），和下方按键拉开距离；
        // 网页右边距与标题栏（PageHeader，32px）一致，文字结尾对齐 ⊕ 按钮的右边
        ...(align === 'right' ? { pt: 0, pb: 3, pl: 2, pr: 4 } : { pt: 0.5, pb: 2.5, px: 2 }),
      }}
    >
      <Typography component="div" sx={{ fontSize: '1rem', lineHeight: 1.5, color: 'text.secondary', textAlign: align }}>
        {content}
      </Typography>
    </Box>
  );
};

export default LearnHint;
