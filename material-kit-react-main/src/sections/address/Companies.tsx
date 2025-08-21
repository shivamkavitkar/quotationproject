// In src/sections/address/Companies.tsx

import axios from 'axios';
import React, { useRef, useState, useEffect, useCallback } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

const API_BASE = 'https://acutesolution.in/api';

interface Company {
  id: number;
  company_name: string;
  city: string | null;
  contact_person: string | null;
  contact_no1: string | null;
  billing_pin_code: string | null;
  billing_state: string | null;
}

const Companies = () => {
  // State for the main list of companies
  const [companies, setCompanies] = useState<Company[]>([]);

  // State for search and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // --- Search Debouncing Logic ---
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // --- Data Fetching Logic ---
  const fetchCompanies = useCallback(async (isNewSearch: boolean) => {
    if (loading) return;
    setLoading(true);

    const pageToFetch = isNewSearch ? 1 : page;

    try {
      const response = await axios.get(`${API_BASE}/companies`, {
        params: {
          page: pageToFetch,
          search: debouncedSearchQuery,
        },
      });

      const fetchedCompanies = response.data.data;

      setCompanies(prev => (isNewSearch ? fetchedCompanies : [...prev, ...fetchedCompanies]));
      setHasMore(response.data.next_page_url !== null);
      if (!isNewSearch) {
        setPage(pageToFetch + 1);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, debouncedSearchQuery]);

  // --- Effect to trigger a new search ---
  useEffect(() => {
    setCompanies([]);
    setPage(1);
    setHasMore(true);
    fetchCompanies(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery]);

  // --- Infinite Scroll Logic ---
  const observer = useRef<IntersectionObserver | null>(null);
  const lastCompanyElementRef = useCallback(
    (node: HTMLTableRowElement) => { // Changed type to HTMLTableRowElement
      if (loading || !hasMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          // Fetch next page when the last row is visible
          fetchCompanies(false);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, fetchCompanies]
  );
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Companies List
      </Typography>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          fullWidth
          label="Search Company Name..."
          variant="outlined"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
        <Table stickyHeader aria-label="companies table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Company Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Contact Person</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Contact No</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>PIN Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>State</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((company, index) => {
              // Attach the ref to the last element for infinite scroll
              const isLastElement = companies.length === index + 1;
              return (
                <TableRow
                  hover
                  ref={isLastElement ? lastCompanyElementRef : null}
                  key={`${company.id}-${index}`}
                >
                  <TableCell>{company.company_name || 'N/A'}</TableCell>
                  <TableCell>{company.contact_person || 'N/A'}</TableCell>
                  <TableCell>{company.contact_no1 || 'N/A'}</TableCell>
                  <TableCell>{company.billing_pin_code || 'N/A'}</TableCell>
                  <TableCell>{company.billing_state || 'N/A'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* --- Indicators --- */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
      {!hasMore && companies.length > 0 && (
         <Typography align="center" sx={{ p: 2, color: 'text.secondary' }}>
          -- You have reached the end --
        </Typography>
      )}
      {!loading && companies.length === 0 && (
         <Typography align="center" sx={{ p: 2, color: 'text.secondary' }}>
          No companies found.
        </Typography>
      )}
    </Box>
  );
};

export default Companies;
