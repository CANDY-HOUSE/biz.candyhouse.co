import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { gUtils } from '@/utils/gUtils';
import LoadingButton from '@mui/lab/LoadingButton';
import {
  Card,
  CardHeader,
  Typography,
  CardContent,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  Box,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import DataTable from '@/components/biz/device/DataTable';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';

const EmployeeRoles = () => {
  const [tags, setTags] = useState([]);
  const [role, setRole] = useState('');
  const [roleCheck, setroleCheck] = useState(true);
  const appAccessTags = gUtils.allTags;
  const initRole = [{ tag: '', companyID: '', access: ['1', '2'] }];
  const [companyRoles, setCompanyRoles] = useState(initRole);
  const { gManageEmployee, gStripe, gMediaType } = useContext(GlobalStateContext);
  const [isPending, setIsPending] = useState();
  const floatingAddRef = useRef(null);

  const handleTagsChange = (e) => {
    const index = tags.indexOf(e.target.value);
    if (index === -1) {
      setTags([...tags, e.target.value]);
    } else {
      setTags(tags.filter((tag) => tag !== e.target.value));
    }
  };

  const changeSingleAccess = (tagSetting) => {
    delete tagSetting.isShowAdd;
    gManageEmployee.postTag(tagSetting, async (_res) => {});
  };

  useEffect(() => {
    setCompanyRoles(applyRoles);
  }, [gManageEmployee.tags]);

  const applyRoles = useMemo(() => {
    let res = gManageEmployee.tags;
    if (!res.length) {
      return [];
    }
    let result = res.map((item) => {
      item.isShowAdd = true;
      if (item.tag === 'オーナー') {
        item.access = gUtils.allTags;
        item.isShowAdd = false;
      } else if (item.tag === 'ゲスト') {
        item.access = ['権限なし'];
        item.isShowAdd = false;
      } else if (item.tag === 'マネージャー') {
        item.access = gUtils.allTags;
        item.isShowAdd = false;
      }
      return item;
    });
    return result;
  }, [gManageEmployee.tags]);

  useEffect(() => {
    if (!gStripe.customerInfo.companyID) return;
    if (gManageEmployee.tags.length > 0) return;
    gManageEmployee.getTags();
  }, [gStripe.customerInfo.companyID]);

  const addRoleComp = useMemo(() => {
    return (
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '10px' }}>
              <Typography variant="h2">新規ロールを追加</Typography>
            </Box>
          }
        />
        <CardContent
          sx={{
            paddingBottom: 'unset',
          }}
        >
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={gMediaType.isMobile ? 12 : 3}>
              <TextField
                size="small"
                label="ロールの名称"
                variant="filled"
                fullWidth
                required
                error={!roleCheck}
                helperText={roleCheck ? '' : 'デフォルトの権限と同じ名前は使用できません'}
                onChange={(e) => {
                  setRole(e.target.value);
                  setroleCheck(
                    e.target.value === 'オーナー' || e.target.value === 'マネージャー' || e.target.value === 'ゲスト'
                      ? false
                      : true
                  );
                }}
                value={role}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl
                sx={{
                  display: 'flex',
                  alignItems: gMediaType.isMobile ? 'flex-start' : 'center',
                  flexDirection: gMediaType.isMobile ? 'column' : 'row',
                  mt: gMediaType.isMobile ? 1 : 0,
                }}
              >
                <FormLabel sx={{ mr: '15px' }}>閲覧可能ページ</FormLabel>
                <FormGroup
                  sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                  }}
                >
                  {appAccessTags.map((tag) => {
                    return (
                      <FormControlLabel
                        control={
                          <Checkbox
                            onChange={(e) => {
                              handleTagsChange(e);
                            }}
                            checked={tags.includes(tag)}
                          />
                        }
                        label={tag}
                        key={tag}
                        value={tag}
                      />
                    );
                  })}
                </FormGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <LoadingButton
                loading={isPending}
                variant="outlined"
                size={gMediaType.isMobile ? 'large' : 'small'}
                fullWidth={gMediaType.isMobile}
                disabled={role === '' || tags.length === 0 || !roleCheck}
                onClick={() => {
                  const data = {
                    access: tags,
                    tag: role,
                  };
                  setIsPending(true);
                  gManageEmployee.postTag(data, async (_res) => {
                    setIsPending(false);
                    setTags([]);
                    setRole('');
                    floatingAddRef.current.handleClose();
                  });
                }}
              >
                登録
              </LoadingButton>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }, [roleCheck, role, appAccessTags, tags, isPending, handleTagsChange, gManageEmployee]);

  return (
    <SesameFloatingAdd ref={floatingAddRef} isMobile={gMediaType.isMobile} popupComponent={addRoleComp}>
      <DataTable
        isMobile={gMediaType.isMobile}
        isAdd={false}
        data={companyRoles}
        selectableRows={'none'}
        isCsv={false}
        isBind={false}
        isDel={false}
        rowHeight={'large'}
        columns={DataTableColumns.companyRole({
          companyRoles,
          setCompanyRoles,
          gManageEmployee,
          changeSingleAccess,
        })}
        callAdd={() => {
          floatingAddRef.current.handleOpen();
        }}
        callSearch={(e) => {
          if (!e) {
            setCompanyRoles(applyRoles);
          } else {
            const result = applyRoles.filter((item) => {
              return item.tag.includes(e) || item.access.some((it) => it.includes(e));
            });
            return setCompanyRoles(result);
          }
        }}
      />
    </SesameFloatingAdd>
  );
};

export default EmployeeRoles;
