import React, { useCallback, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import SesameFloatingAdd from './SesameFloatingAdd';
import SesameDeviceList from '@/components/personal/SesameDeviceList';

/**
 * 通用设备列表容器组件
 * @param {Object} props
 * @param {Array} props.dataSource - 设备数据源
 * @param {Function} props.onDragEnd - 拖拽结束回调 (newData, oldIdx, newIdx) => void，传入则启用拖拽
 * @param {Function} props.onItemClick - 项目点击回调 (item, index) => void，传入则启用点击
 * @param {Function} props.onSearch - 搜索回调 (searchText, allData) => filteredData，传入则启用搜索
 * @param {React.Component} props.popupComponent - 自定义弹窗内容组件
 * @param {Object} props.gIot - IoT 实例（可选）
 * @param {boolean} props.isMobile - 是否为移动端
 * @param {boolean} props.enableFloatingAdd - 是否启用浮动添加按钮，默认 true
 * @param {Function} props.filterFunction - 自定义过滤函数 (item, searchText) => boolean，传入则启用搜索
 * @param {React.Ref} ref - 转发的 ref，可访问 floatingAddRef
 */
const GenericDeviceListContainer = forwardRef(
  (
    {
      dataSource = [],
      onDragEnd,
      onItemClick,
      onSearch,
      popupComponent,
      gIot,
      isMobile = false,
      enableFloatingAdd = true,
      filterFunction,
    },
    ref
  ) => {
    const floatingAddRef = useRef(null);
    const [displayData, setDisplayData] = useState([]);

    // 暴露 floatingAddRef 给父组件
    useImperativeHandle(ref, () => floatingAddRef.current);

    useEffect(() => {
      setDisplayData(dataSource);
    }, [dataSource]);

    const defaultFilterFunction = useCallback((item, searchText) => {
      return item.deviceName?.includes(searchText) || false;
    }, []);

    const handleSearch = useCallback(
      (searchText) => {
        if (!searchText) {
          setDisplayData(dataSource);
          return;
        }

        if (onSearch) {
          // 使用自定义搜索函数
          const result = onSearch(searchText, dataSource);
          setDisplayData(result);
        } else if (filterFunction) {
          // 使用自定义过滤函数
          const result = dataSource.filter((item) => filterFunction(item, searchText));
          setDisplayData(result);
        } else {
          // 使用默认过滤逻辑
          const result = dataSource.filter((item) => defaultFilterFunction(item, searchText));
          setDisplayData(result);
        }
      },
      [dataSource, onSearch, filterFunction, defaultFilterFunction]
    );

    const handleRowClick = useCallback(
      (index) => {
        if (onItemClick) {
          const item = displayData[index];
          onItemClick(item, index);
        }
      },
      [displayData, onItemClick]
    );

    const handleDragEnd = useCallback(
      (newData, oldIdx, newIdx) => {
        if (onDragEnd) {
          onDragEnd(newData, oldIdx, newIdx);
        }
      },
      [onDragEnd]
    );

    // 根据是否传入回调函数来决定是否启用功能
    const enableSearch = Boolean(onSearch || filterFunction);
    const enableDrag = Boolean(onDragEnd);

    const deviceListContent = (
      <SesameDeviceList
        devices={displayData}
        gIot={gIot}
        onDragEnd={enableDrag ? handleDragEnd : undefined}
        callSearch={enableSearch ? handleSearch : undefined}
        callRowClick={onItemClick ? handleRowClick : undefined}
      />
    );

    if (!enableFloatingAdd) {
      return deviceListContent;
    }

    return (
      <SesameFloatingAdd ref={floatingAddRef} isMobile={isMobile} popupComponent={popupComponent}>
        {deviceListContent}
      </SesameFloatingAdd>
    );
  }
);

GenericDeviceListContainer.displayName = 'GenericDeviceListContainer';

export default GenericDeviceListContainer;
