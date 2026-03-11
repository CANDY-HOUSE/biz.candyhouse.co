import { IconButton, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Box } from '@mui/system';
import DeleteIcon from '@mui/icons-material/Delete';

export default function CfpSimpleTable({ items, btnDel, name = 'deviceName' }) {
  const [isShow, setIsShow] = useState(false);

  useEffect(() => {
    setIsShow(items.length > 0);
  }, [items]);
  const style = {
    borderBottom: 1, // 设置边框宽度
    opacity: 0.1,
    borderColor: 'gray', // 设置边框颜色
  };

  return (
    <>
      {isShow && (
        <Box sx={{ marginBottom: '20px', maxWidth: '98%' }}>
          {/* <Typography>名称</Typography> */}
          <Box sx={style} />
          {items.map((item, index) => {
            return (
              <React.Fragment key={index}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography>{item[name]}</Typography>
                  <IconButton
                    onClick={() => {
                      if (btnDel) btnDel(item);
                    }}
                  >
                    <DeleteIcon sx={{ color: 'error.main' }} />
                    {/*   <DeleteItem />*/}
                  </IconButton>
                </Box>

                <Box sx={style} />
              </React.Fragment>
            );
          })}
        </Box>
      )}
    </>
  );
}
