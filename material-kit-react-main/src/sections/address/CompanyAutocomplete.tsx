import axios from 'axios';
import React, { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';

const API_BASE = '/api';

interface CompanyOption {
  id: number;
  company_name: string;
}

interface CompanyAutocompleteProps {
  onCompanySelect: (company: CompanyOption | null) => void;
}

export function CompanyAutocomplete({ onCompanySelect }: CompanyAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (inputValue.length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE}/companies/autocomplete`, {
          params: { q: inputValue },
        });
        setOptions(response.data);
      } catch (error) {
        console.error('Failed to fetch autocomplete options:', error);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue]);

  return (
    <Autocomplete
      id="company-autocomplete-search"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      getOptionLabel={(option) => option.company_name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      loading={loading}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      onChange={(event, newValue) => {
        onCompanySelect(newValue);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search Company Name..."
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}