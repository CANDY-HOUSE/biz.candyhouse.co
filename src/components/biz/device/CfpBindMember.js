import Autocomplete from '@mui/material/Autocomplete';
import { TextField } from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import React, { useContext, useEffect, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';

export const CfpBindMM = ({ defaultVal, callBindMm }) => {
  const { gManageEmployee } = useContext(GlobalStateContext);
  const [isFocused, setFocused] = useState(false);

  const [selectedOption, setSelectedOption] = useState(defaultVal);
  const [inputValue, setInputValue] = useState(defaultVal ? defaultVal.employeeName : '');

  useEffect(() => {
    setSelectedOption(defaultVal);
    setInputValue(defaultVal ? defaultVal.employeeName : '');
  }, [defaultVal]);

  const filterOptions = (options, { inputValue }) => {
    return options.filter(
      (option) => option && option.employeeName && option.employeeName.toLowerCase().includes(inputValue.toLowerCase())
    );
  };

  return (
    <>
      <Autocomplete
        size="small"
        variant="outlined"
        value={selectedOption ?? null}
        freeSolo
        clearOnBlur
        options={gManageEmployee.employees.Items || []}
        getOptionLabel={(option) => {
          return option && option.employeeName ? option.employeeName : '';
        }}
        inputValue={inputValue}
        onInputChange={(event, newInputValue, reason) => {
          if (reason === 'clear') {
            setInputValue('');
            setSelectedOption(null);
            if (callBindMm) callBindMm(null);
            return;
          }
          setInputValue(newInputValue);
          const matchedOption = gManageEmployee.employees.Items.find((item) => item.employeeName === newInputValue);
          if (matchedOption) {
            setSelectedOption(matchedOption);
            if (callBindMm) callBindMm(matchedOption);
          }
        }}
        onChange={(event, newValue) => {
          setSelectedOption(newValue);
          setInputValue(newValue ? newValue.employeeName : '');
          if (callBindMm) callBindMm(newValue);
        }}
        filterOptions={filterOptions}
        renderInput={(params) => (
          <TextField
            size="small"
            label="ユーザー"
            {...params}
            InputProps={{
              ...params.InputProps,
              type: 'text',
              startAdornment: (
                <InputAdornment position="start">
                  {!isFocused && !inputValue && <SearchIcon sx={{ marginTop: '4px' }} fontSize="small" />}
                </InputAdornment>
              ),
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            sx={{ width: '100%', paddingLeft: '0px' }}
          />
        )}
      />
    </>
  );
};
