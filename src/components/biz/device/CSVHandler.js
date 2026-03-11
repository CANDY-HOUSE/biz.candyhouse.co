import Button from '@mui/material/Button';
import React, { useContext, useState, useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { parse } from 'papaparse';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FileUploadIcon from '@mui/icons-material/FileUpload';

import { GlobalStateContext } from '@context/GlobalContextProvider';
import { gUtils } from '@/utils/gUtils';
import * as XLSX from 'xlsx';
import DescriptionIcon from '@mui/icons-material/Description';
import { LoadingButton } from '@mui/lab';

// 卡片管理頁的CSV登錄功能

const transformExcelData = (excelData) => {
  if (!Array.isArray(excelData) || excelData.length === 0) {
    return [];
  }

  // 取得表头
  const headers = excelData[0];

  // 取得数据行，并转换为对象格式
  const csvData = excelData.slice(1).map((row) => {
    let rowData = {};
    headers.forEach((header, index) => {
      rowData[header] = row[index];
    });
    return rowData;
  });

  return csvData;
};

const uploadCsv = async (e, set, close) => {
  e.preventDefault();
  const file = e.target.files[0];
  if (!file) return;

  const fileExtension = file.name.split('.').pop().toLowerCase();
  console.log('获取当前文件名', fileExtension);
  if (fileExtension === 'csv') {
    const text = await file.text();
    let data = parse(text, { header: true, skipEmptyLines: true }).data;
    console.log('获取到的CSV数据', data);
    set(data);
    if (close) {
      close(false);
    }
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      let jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        blankrows: false,
      });
      console.log('获取到的XLS数据', jsonData);
      let csvData = transformExcelData(jsonData);
      console.log('获取到的csvData数据', csvData);
      set(csvData);
      if (close) {
        close(false);
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    console.error('不支持的文件类型');
  }

  e.target.value = null;
};

export const CSVbutton = ({ hint, setData, isShowFileClick, loading }) => {
  const { setCustomModalOpen, setModalContent } = useContext(GlobalStateContext);
  const fileRef = useRef(null);

  useEffect(() => {
    if (isShowFileClick) {
      setModalContent(modalContent());
      setCustomModalOpen(true);
    }
  }, [isShowFileClick]);

  const handleSure = () => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  };

  const modalContent = () => (
    <Box sx={{ width: '100%' }}>
      <Typography variant="small">テンプレート</Typography>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            size="small"
            sx={{ mr: 1, color: '#333' }}
            startIcon={<DescriptionIcon />}
            onClick={() => gUtils.csvUtils.downloadExcelTemp()}
          >
            Windows向け
          </Button>
          <Button
            size="small"
            sx={{ mr: 1, color: '#333' }}
            startIcon={<DescriptionIcon />}
            onClick={() => gUtils.csvUtils.downloadCsv()}
          >
            Mac向け
          </Button>
        </Box>
      </Box>

      {hint?.length && (
        <Box
          sx={{
            backgroundColor: '#FFF8F0',
            p: 2,
            borderRadius: '4px',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
            <WarningAmberIcon sx={{ color: '#F5A623', mr: 1, fontSize: '20px' }} />
            <Box>
              <Typography sx={{ fontWeight: 'bold', color: '#999' }}>注意</Typography>
              <Typography sx={{ fontSize: '14px', color: '#999', mt: 0.5 }}>{hint}</Typography>
            </Box>
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="small" sx={{ mr: 1, color: '#28aeb1' }} onClick={() => setCustomModalOpen(false)}>
          キャンセル
        </Button>
        <Button
          disableElevation
          size="small"
          variant="outlined"
          sx={{
            color: '#28aeb1',
            border: '1px solid #28aeb1',
            '&:hover': {
              border: '1px solid #28aeb1',
            },
          }}
          onClick={(e) => {
            e.preventDefault();
            handleSure();
          }}
        >
          一括登録・更新
        </Button>
      </Box>
      <input ref={fileRef} type="file" accept=".csv, .xlsx, .xls" hidden onChange={(e) => uploadCsv(e, setData)} />
    </Box>
  );

  return (
    <LoadingButton
      loading={loading}
      size="small"
      variant="outlined"
      startIcon={<FileUploadIcon />}
      onClick={(e) => {
        e.preventDefault();
        setModalContent(modalContent());
        setCustomModalOpen(true);
      }}
    >
      一括登録・更新
    </LoadingButton>
  );
};

export default function CSVHandler({
  hint,
  setData,
  isUserData = true,
  isUploadCsv = true,
  isUploadCsvCall = undefined,
  isShowFileClick = false,
  loading = false,
}) {
  const [setOpenModal] = useState(false);
  const handleOpen = () => setOpenModal(true);

  return (
    <>
      <CSVbutton
        hint={hint}
        loading={loading}
        setData={setData}
        isUploadCsv={isUploadCsv}
        isUploadCsvCall={isUploadCsvCall}
        isShowFileClick={isShowFileClick}
        isUserData={isUserData}
        setOpenModal={setOpenModal}
        handleOpen={handleOpen}
      />
    </>
  );
}
