import React, { useEffect, useMemo, useState } from 'react';
import { Select, MenuItem, FormControl } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import OutlinedInput from '@mui/material/OutlinedInput';
import { useTranslation } from 'react-i18next';
import { ios } from '@/theme/appHomeStyle';

function CmDropdownSelect({ itemsSelect, callSelect }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false); // 新增状态来控制下拉菜单的打开

  const accessControlDevicesCount = useMemo(() => itemsSelect.length, [itemsSelect]);

  useEffect(() => {
    let item = {
      deviceName: t('bizui.history.all'),
      deviceUUID: '0',
    };

    let result = [item, ...itemsSelect];
    if (itemsSelect.length > 0) {
      if (callSelect) callSelect(item.deviceUUID);
    }

    setValue(item.deviceUUID);
    setItems(result);
  }, [accessControlDevicesCount]);

  const handleChange = (event) => {
    setValue(event.target.value);
    if (callSelect) callSelect(event.target.value);
  };

  const handleIconClick = () => {
    // 切换下拉菜单的打开状态
    setOpen(!open);
  };

  return (
    <FormControl size="small">
      <Select
        labelId="demo-simple-select-label"
        id="demo-simple-select"
        value={value}
        open={open} // 控制下拉菜单的打开状态
        onOpen={() => setOpen(true)} // 当下拉菜单打开时设置状态为 true
        onClose={() => setOpen(false)} // 当下拉菜单关闭时设置状态为 false
        onChange={handleChange}
        input={
          <OutlinedInput
            sx={{
              minWidth: 160,
              height: 36,
              borderRadius: '10px',
              bgcolor: ios.fill,
              fontSize: 15,
              color: ios.label,
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& .MuiSvgIcon-root': { color: ios.secondaryLabel, cursor: 'pointer' },
            }}
          />
        }
        MenuProps={{ slotProps: { paper: { sx: { mt: '4px', borderRadius: '12px' } } } }}
        IconComponent={() => (
          <KeyboardArrowDownIcon
            sx={{
              fontSize: '22px',
              marginRight: '8px',
            }}
            onClick={handleIconClick} // 绑定点击事件处理器
          />
        )}
      >
        {items.map((item, index) => (
          <MenuItem key={index} value={item.deviceUUID}>
            {item.deviceName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default CmDropdownSelect;
