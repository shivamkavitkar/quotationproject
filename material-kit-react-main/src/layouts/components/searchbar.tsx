import type { BoxProps } from '@mui/material/Box';

import { useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Slide from '@mui/material/Slide';
import Input from '@mui/material/Input';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ClickAwayListener from '@mui/material/ClickAwayListener';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// Define props for the Searchbar component to accept a search handler
interface SearchbarProps extends BoxProps {
  onSearch: (searchTerm: string) => void; // This is the new prop we'll add
}

export function Searchbar({ sx, onSearch, ...other }: SearchbarProps) { // Add onSearch to props
  const theme = useTheme();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // New state to hold the input value

  const handleOpen = useCallback(() => {
    setOpen((prev) => !prev);
    // Optionally clear search term when opening, or keep it
    if (!open) setSearchTerm('');
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Optionally clear search term when closing
    setSearchTerm('');
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const handlePerformSearch = useCallback(() => {
    // Only perform search if there's a term
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim()); // Call the prop function with the search term
      handleClose(); // Close the search bar after performing search
    }
  }, [searchTerm, onSearch, handleClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handlePerformSearch();
    }
  }, [handlePerformSearch]);

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <div>
        {!open && (
          <IconButton onClick={handleOpen}>
            <Iconify icon="eva:search-fill" />
          </IconButton>
        )}

        <Slide direction="down" in={open} mountOnEnter unmountOnExit>
          <Box
            sx={{
              top: 0,
              left: 0,
              zIndex: 99,
              width: '100%',
              display: 'flex',
              position: 'absolute',
              alignItems: 'center',
              px: { xs: 3, md: 5 },
              boxShadow: theme.vars.customShadows.z8,
              height: {
                xs: 'var(--layout-header-mobile-height)',
                md: 'var(--layout-header-desktop-height)',
              },
              backdropFilter: `blur(6px)`,
              WebkitBackdropFilter: `blur(6px)`,
              backgroundColor: varAlpha(theme.vars.palette.background.defaultChannel, 0.8),
              ...sx,
            }}
            {...other}
          >
            <Input
              autoFocus
              fullWidth
              disableUnderline
              placeholder="Search by customer name, company name, or contact number…" // Updated placeholder
              value={searchTerm} // Bind input to state
              onChange={handleInputChange} // Update state on change
              onKeyDown={handleKeyDown} // Trigger search on Enter key
              startAdornment={
                <InputAdornment position="start">
                  <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              }
              sx={{ fontWeight: 'fontWeightBold' }}
            />
            <Button variant="contained" onClick={handlePerformSearch}> {/* Call search on button click */}
              Search
            </Button>
          </Box>
        </Slide>
      </div>
    </ClickAwayListener>
  );
}