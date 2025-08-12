// src/sections/address/Companies.tsx

import './Companies.css';

import axios from 'axios';
import React, { useRef, useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

interface Company {
  id: number;
  company_name: string;
  city: string | null;
  contact_person: string | null;
}

const Companies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  
  const observer = useRef<IntersectionObserver | null>(null);

  const lastCompanyElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const fetchCompanies = useCallback(async () => {
    if (!hasMore) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/companies?page=${page}`);
      const fetchedCompanies = response.data.data;

      if (fetchedCompanies.length === 0) {
        setHasMore(false);
      } else {
        setCompanies((prevCompanies) => {
            const existingIds = new Set(prevCompanies.map(c => c.id));
            const newCompanies = fetchedCompanies.filter((c: Company) => !existingIds.has(c.id));
            return [...prevCompanies, ...newCompanies];
        });
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);


  return (
    <div className="companies-container">
      <h1>Companies List</h1>
      <div className="companies-list">
        {companies.map((company, index) => {
          if (companies.length === index + 1) {
            return (
              <div ref={lastCompanyElementRef} key={company.id} className="company-card">
                <h2>{company.company_name}</h2>
                <p><strong>Contact:</strong> {company.contact_person || 'N/A'}</p>
                <p><strong>City:</strong> {company.city || 'N/A'}</p>
              </div>
            );
          } else {
            return (
              <div key={company.id} className="company-card">
                <h2>{company.company_name}</h2>
                <p><strong>Contact:</strong> {company.contact_person || 'N/A'}</p>
                <p><strong>City:</strong> {company.city || 'N/A'}</p>
              </div>
            );
          }
        })}
      </div>
      {loading && <div className="loading-indicator">Loading more companies...</div>}
      {!hasMore && companies.length > 0 && <div className="end-of-list-indicator">-- You have reached the end --</div>}
    </div>
  );
};

export default Companies;