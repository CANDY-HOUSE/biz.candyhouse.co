import React, { useRef, useState } from 'react';
import GetAppIcon from '@mui/icons-material/GetApp';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Box, Button, Card, Divider, Typography } from '@mui/material';
import { parse } from 'papaparse';
import { checkRange, downloadCsv, shopifyCSV2ShippingCSV, yamatoHeaders } from './CsUtils';

const YamatoShippingCsv = () => {
  const fileInputRef = useRef(null);
  const [csvYamatoData, setYamatoCSV] = useState([]);
  const [shippingAmount, setShippingAmount] = useState({ start: '', end: '' });
  const [exception, setException] = useState([]);
  const [inStockData, setInStockData] = useState([]);
  const [orderChangeList, setOrderChangeList] = useState([]);

  const handleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const csvArray = parse(text, { header: true, skipEmptyLines: true });
    const [start, end, startEndData] = checkRange(csvArray.data);
    const [yamatoList, nextInStockData, nextException, nextOrderChangeList] = shopifyCSV2ShippingCSV(startEndData);
    setYamatoCSV(yamatoList);
    setShippingAmount({ start, end });
    setInStockData(nextInStockData);
    setException(nextException);
    setOrderChangeList(nextOrderChangeList);
    downloadCsv(yamatoList, 'yamato_b2.csv', yamatoHeaders);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ p: 2 }}>
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            await handleFile(Array.from(e.dataTransfer.files)[0]);
          }}
        >
          <UploadFileIcon color="primary" />
          <Typography>DROP HERE(order_export.csv)</Typography>
          <Typography variant="body2" sx={{ color: 'info.light' }}>
            or click to choose a CSV file
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={async (e) => {
              await handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </Box>

        {csvYamatoData.length > 0 && (
          <Button
            sx={{ mt: 2 }}
            startIcon={<GetAppIcon />}
            onClick={() => downloadCsv(csvYamatoData, 'yamato_b2.csv', yamatoHeaders)}
          >
            Yamato CSV
          </Button>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography sx={{ color: 'primary.main' }}>出貨統計</Typography>
        {inStockData.map((row) => (
          <Typography key={row.product}>
            {row.product}:{row.productAmount}
          </Typography>
        ))}
        <Typography>結束單號：{shippingAmount.start}</Typography>
        <Typography>開始單號：{shippingAmount.end}</Typography>

        {exception.length !== 0 && <Typography sx={{ mt: 2, color: 'primary.main' }}>例外狀況</Typography>}
        {exception.map((row, index) => (
          <Typography key={`${row.Name}-${index}`}>
            {row.Name}:{row['Lineitem sku']}
          </Typography>
        ))}

        {orderChangeList.length !== 0 && <Typography sx={{ mt: 2, color: 'primary.main' }}>更動訂單情況</Typography>}
        {orderChangeList.map((row, index) => (
          <Typography key={`${row.Name}-${index}`}>{row.Name}</Typography>
        ))}
      </Card>
    </Box>
  );
};

export default YamatoShippingCsv;
