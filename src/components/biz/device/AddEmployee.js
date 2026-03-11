import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import Hider from '@/components/biz/Hider';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import CSVHandler from './CSVHandler';
import {
  CardContent,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Card,
  CardHeader,
  Box,
  IconButton,
  Typography,
  Grid,
  Button,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import LoadingButton from '@mui/lab/LoadingButton';
import QrCodeIcon from '@mui/icons-material/QrCode';
import CheckMember from './CheckMember';
import { gUtils } from '@/utils/gUtils';
import { CfpMsg } from './CfpMsg';
import { biz3utils } from '@/utils/biz3utils';
import { useTranslation } from 'react-i18next';

export default function AddEmployee({ tags, completionCallback }) {
  const navigate = useNavigate();
  const { gStripe, gManageEmployee, setModalTitle, setModalContent, setCustomModalOpen, setSnackbarValue, gMediaType } =
    useContext(GlobalStateContext);

  const [member, setMember] = useState({
    employeeEmail: '',
    employeeName: '',
    phone: undefined,
    department: undefined,
  });
  const [tagItems, setTagItems] = useState([]);
  const [mailChk, setMailChk] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const { t } = useTranslation();
  const isMobile = gMediaType.isMobile;

  const submit = (param, cb) => {
    gManageEmployee.addEmployee(param, (res) => {
      setMember({
        employeeEmail: '',
        employeeName: '',
        phone: '',
        department: '',
      });
      setIsPending(false);
      setTagItems([]);
      cb && cb();
      completionCallback && completionCallback(res);
    });
  };

  const handleSubmit = () => {
    let body = {
      ...member,
      phone: member.phone === '' ? undefined : member.phone,
      department: member.department === '' ? undefined : member.department,
      tag: tagItems,
      companyID: gStripe.customerInfo.companyID,
    };
    if (!!gStripe.customerInfo.isSesameApp) {
      submit([body]);
      return;
    }
    const ownerEmail = gStripe.customerInfo.mainEmail || gStripe.customerInfo.employeeEmail;
    if (isValidProfile([body])) {
      //判斷 要新增的社員email 跟 ownerEmail是不是一樣
      if (body.employeeEmail && ownerEmail && body.employeeEmail.toLowerCase() === ownerEmail.toLowerCase()) {
        setIsPending(false);
        showError('オーナーのメールアドレスと同じメールアドレスは追加できません。');
        return;
      }
      submit([body]);
    } else {
      setIsPending(false);
      setSnackbarValue({
        open: true,
        msg: '有効なユーザー名およびメールアドレスを入力してください。いずれも空欄では登録できません。',
      });
    }
  };

  const handleOpenModal = async (csvData) => {
    setCustomModalOpen(false);
    setModalTitle('ロールを選択');
    setModalContent(
      <CheckMember
        btnClose={setCustomModalOpen}
        tags={tags}
        btnSure={(tag, callback) => {
          handleCsvSubmit(csvData, tag, callback);
        }}
      />
    );
    setCustomModalOpen(true);
  };

  const handleCsvSubmit = async (fileData, tag, callback) => {
    const csvData = fileData.filter((item) => {
      return (
        item.メールアドレス && item.メールアドレス !== 'undefined' && item.ユーザー名 && item.ユーザー名 !== 'undefined'
      );
    });
    const ownerEmail = gStripe.customerInfo.mainEmail || gStripe.customerInfo.employeeEmail;
    const items = csvData.map((item) => {
      let param = {
        companyID: gStripe.customerInfo.companyID,
        employeeEmail: item['メールアドレス'],
        employeeName: item['ユーザー名'],
        tag,
        phone: item['電話番号（任意）'] || '',
        department: item['所属（任意）'] || '',
      };
      if (param.employeeEmail && ownerEmail && param.employeeEmail.toLowerCase() === ownerEmail.toLowerCase()) {
        param.tag = gStripe.customerInfo.tag;
      }
      return param;
    });
    if (!isValidProfile(items)) {
      setSnackbarValue({
        open: true,
        msg: '有効なユーザー名およびメールアドレスを入力してください。いずれも空欄では登録できません。',
      });
      callback && callback();
      setCustomModalOpen(false);
      return;
    }
    const duplicateEmails = [
      ...new Set(
        items
          .map((item) => item.employeeEmail?.toLowerCase())
          .filter(Boolean)
          .filter((e, i, a) => a.indexOf(e) !== i)
      ),
    ];
    if (duplicateEmails.length > 0) {
      setSnackbarValue({
        open: true,
        msg: `重複したメールアドレスが存在します。修正したデータで再度アップロードしてください。
        ${duplicateEmails.join('\n')}`,
      });
      callback && callback();
      setCustomModalOpen(false);
      return;
    }
    setIsPending(true);
    submit(items, () => {
      setCustomModalOpen(false);
      callback && callback();
    });
  };

  const showError = (msg) => {
    setModalTitle('');
    setCustomModalOpen(false);
    setModalContent(
      <CfpMsg
        msg={msg}
        onClick={() => {
          setCustomModalOpen(false);
        }}
      />
    );
    setCustomModalOpen(true);
  };

  const isValidEmail = (list) => {
    return list.every((item) => gUtils.isValidEmail(item.employeeEmail));
  };

  const isValidMember = (list) => {
    return list.every((item) => item.employeeName && item.employeeName.trim() !== '');
  };

  const isValidProfile = (list) => {
    return isValidEmail(list) && isValidMember(list);
  };

  const downloadTemplate = () => {
    const fields = ['ユーザー名', 'メールアドレス', '所属（任意）', '電話番号（任意）'];
    var csv = Papa.unparse({ fields });
    var blob = new Blob([csv]);
    var a = window.document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = 'SASEME_Biz_add_users_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isDisableSubmit = useMemo(() => {
    if (!tags) {
      return member.employeeEmail === '' || mailChk !== true;
    }
    return member.employeeName === '' || member.employeeEmail === '' || tagItems.length < 1 || mailChk !== true;
  }, [member.employeeName, member.employeeEmail, tagItems.length, mailChk, tags]);

  const inputSX = {
    '& .MuiOutlinedInput-root': {
      '&.Mui-focused fieldset': {
        borderColor: '#28aeb1',
      },
    },
    '& .MuiInputLabel-outlined.Mui-focused': {
      color: '#28aeb1',
    },
  };

  return (
    <Card elevation={0} sx={{ padding: 0 }}>
      <CardHeader
        title={
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Box sx={{ bgcolor: gStripe.isFromApp ? 'secondary.light' : 'white', p: 2, flex: 1 }}>
              <Typography sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {t('deviceMember.findFriendHint')}
              </Typography>
            </Box>
            {!isMobile && tags?.length > 0 ? (
              <Box sx={{ display: 'flex' }}>
                <CSVHandler setData={handleOpenModal} downData={downloadTemplate} />
              </Box>
            ) : (
              <></>
            )}
          </Box>
        }
      />
      <CardContent sx={{ p: 2, py: 'unset' }}>
        <Grid container alignItems="top" spacing={1.5} sx={{ mt: '2px', p: '0px' }}>
          {/* 移动端时每个字段占满整行 */}
          {tags?.length > 0 && (
            <Grid item xs={isMobile ? 12 : 2}>
              <TextField
                size="small"
                label="ユーザー名"
                variant="filled"
                fullWidth
                required
                value={member.employeeName}
                onChange={(e) => {
                  setMember({ ...member, employeeName: e.target.value });
                }}
                sx={inputSX}
              />
            </Grid>
          )}
          <Grid item xs={isMobile || !tags ? 12 : 2}>
            <TextField
              size="small"
              label="メールアドレス"
              variant="filled"
              error={!mailChk}
              helperText={mailChk ? '' : 'メールアドレスの形式が正しくありません'}
              fullWidth
              required
              value={member.employeeEmail}
              onChange={(e) => {
                setMember({ ...member, employeeEmail: e.target.value });
                setMailChk(gUtils.isValidEmail(e.target.value));
              }}
              sx={inputSX}
            />
          </Grid>
          {tags?.length > 0 && (
            <>
              <Grid item xs={isMobile ? 12 : 2}>
                <TextField
                  size="small"
                  label="所属（任意）"
                  variant="filled"
                  fullWidth
                  value={member.department}
                  onChange={(e) => {
                    setMember({ ...member, department: e.target.value.trim() });
                  }}
                  sx={inputSX}
                />
              </Grid>
              <Grid item xs={isMobile ? 12 : 2}>
                <TextField
                  size="small"
                  label="電話番号（任意）"
                  variant="filled"
                  fullWidth
                  value={member.phone}
                  onChange={(e) => {
                    setMember({ ...member, phone: e.target.value.trim() });
                  }}
                  sx={inputSX}
                />
              </Grid>
            </>
          )}
          {tags?.length > 0 && (
            <Grid item xs={12}>
              <FormControl
                sx={{
                  display: 'flex',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  flexDirection: isMobile ? 'column' : 'row',
                  mt: isMobile ? 1 : 0,
                }}
              >
                <FormLabel sx={{ mr: '15px', width: '70px' }} required>
                  ロール
                </FormLabel>
                <FormGroup sx={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
                  {tags
                    .filter((i) =>
                      gStripe.customerInfo.access.includes('ユーザー')
                        ? i.tag !== 'オーナー'
                        : i.tag !== 'オーナー' && i.tag !== 'マネージャー'
                    )
                    .sort((a, b) => b.access.length - a.access.length)
                    .map((i) => {
                      return (
                        <FormControlLabel
                          control={
                            <Checkbox
                              sx={{
                                color: '#BDBDBD',
                                '& .MuiSvgIcon-root': {
                                  fontSize: 25,
                                },
                              }}
                              onChange={(e) => {
                                let index = tagItems.indexOf(e.target.value);
                                if (e.target.value === 'ゲスト') {
                                  if (index === -1) {
                                    setTagItems([e.target.value]);
                                  } else {
                                    setTagItems([]);
                                  }
                                } else {
                                  if (index === -1) {
                                    setTagItems([...tagItems, e.target.value].filter((tag) => tag !== 'ゲスト'));
                                  } else {
                                    setTagItems(tagItems.filter((tag) => tag !== e.target.value));
                                  }
                                }
                              }}
                              checked={tagItems.includes(i.tag)}
                            />
                          }
                          label={i.tag}
                          value={i.tag}
                          key={i.tag}
                        />
                      );
                    })}
                </FormGroup>
              </FormControl>
              {gStripe.customerInfo.access && (
                <Hider show={gStripe.customerInfo.access.includes('ロール管理')}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      navigate(`/employees/role`);
                    }}
                  >
                    <AddCircleIcon fontSize="inherit" />
                  </IconButton>
                </Hider>
              )}
            </Grid>
          )}
          {gStripe.customerInfo.isSesameApp && (
            <Button varient="text" component="label" startIcon={<QrCodeIcon />} sx={{ ml: 1 }}>
              QRコードで追加
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const fileInput = e.target;
                  biz3utils.readUserQrcode(e.target.files[0], (e, userInfo) => {
                    if (!userInfo) {
                      setSnackbarValue({
                        open: true,
                        msg: '読み取りに失敗しました。QRコードが正しいか確認してください。',
                      });
                      return;
                    }
                    const sendParam = {
                      ...userInfo,
                      companyID: gStripe.customerInfo.companyID,
                    };
                    submit([sendParam]);
                    fileInput.value = '';
                  });
                }}
              />
            </Button>
          )}
          <Grid item xs={12} sx={{ mt: isMobile ? 1 : 0 }}>
            <LoadingButton
              loading={!isDisableSubmit && isPending}
              variant="outlined"
              size={isMobile ? 'large' : 'small'}
              disabled={isDisableSubmit}
              onClick={(e) => {
                e.preventDefault();
                setIsPending(true);
                handleSubmit();
              }}
              sx={{ height: '40px' }}
              fullWidth
            >
              登録
            </LoadingButton>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
