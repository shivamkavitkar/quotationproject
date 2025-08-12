// src/sections/product/view/products-view.tsx
import './products-view.css';

import axios from 'axios';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';

// Material-UI Components
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const API_BASE = 'http://localhost:8000/api';
const ASSET_BASE_URL = import.meta.env.VITE_LARAVEL_ASSET_URL || 'http://localhost:8000';

// Interfaces
interface Product {
  product_id: number;
  name: string;
  price: number;
  category_name?: string;
  current_stock?: number;
  picture?: string;
  picture_full_url?: string;
  specification_value?: string | Record<string, any>;
}

interface ProductSpecs {
  size: string;
  length: string;
  width: string;
  height: string;
  price: string;
}

export function ProductsView({ toggleSidebar }: { toggleSidebar: () => void }) {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [imagePreviews, setImagePreviews] = useState<Record<number, string>>({});
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [productSpecs, setProductSpecs] = useState<Record<number, ProductSpecs>>({});
  const [savingSpecId, setSavingSpecId] = useState<number | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 50;

  // Data Fetching Logic (wrapped in useCallback for stable reference)
  const fetchProducts = useCallback(async (resetTable = false) => {
    setLoading(true);
    const pageToFetch = resetTable ? 1 : page;

    try {
      const response = await axios.get(`${API_BASE}/products`, {
        params: {
          page: pageToFetch,
          per_page: limit,
          search: appliedFilter,
        },
      });

      const apiData = response.data || {};
      const newFetchedProducts = apiData.data || [];
      const totalItems = apiData.total ?? 0;

      setProducts(prev => {
        const updatedProducts = resetTable ? newFetchedProducts : [...prev, ...newFetchedProducts.filter((p: Product) => !prev.some(ep => ep.product_id === p.product_id))];
        
        const initialSpecs: Record<number, ProductSpecs> = {};
        updatedProducts.forEach((p: Product) => {
            let parsedSpec: Partial<ProductSpecs> = {};
            if (typeof p.specification_value === 'string') {
                try { parsedSpec = JSON.parse(p.specification_value); } catch (e) { parsedSpec = {}; }
            } else if (typeof p.specification_value === 'object' && p.specification_value !== null) {
                parsedSpec = p.specification_value as ProductSpecs;
            }
            initialSpecs[p.product_id] = {
                size: parsedSpec.size || '',
                length: parsedSpec.length || '',
                width: parsedSpec.width || '',
                height: parsedSpec.height || '',
                price: parsedSpec.price || '',
            };
        });
        setProductSpecs(prevSpecs => ({ ...prevSpecs, ...initialSpecs }));
        
        return updatedProducts;
      });

      setPage(pageToFetch + 1);
      setHasMore((pageToFetch * limit) < totalItems);
    } catch (error: any) {
      console.error('[fetchProducts] Fetch error:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilter]); // Dependencies for fetchProducts


  // Effect for Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setAppliedFilter(searchQuery);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Effect for fetching data when filter changes
  useEffect(() => {
    // This effect now ONLY triggers when appliedFilter changes, breaking the loop.
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilter]);


  const lastProductElementRef = useCallback((node: HTMLTableRowElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchProducts(false);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchProducts]);

  // All other handlers (handleSearchChange, handleFileSelect, etc.) remain the same...

  // (I am omitting the other handler functions for brevity as they don't need changes)
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleProductRowClick = useCallback((product: Product) => {
    navigate('/quotations/create', { state: { productId: product.product_id, productName: product.name } });
  }, [navigate]);

  const handleCreateQuotationClick = useCallback(() => {
    navigate('/quotations/create');
  }, [navigate]);

  const handleViewQuotationsClick = useCallback(() => {
    navigate('/quotations');
  }, [navigate]);
  
  const handleImageUploadButtonClick = useCallback((productId: number) => {
    if (uploadingImageId !== null) return;
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-product-id', String(productId));
      fileInputRef.current.value = '';
      fileInputRef.current.click();
      setUploadingImageId(productId);
      setUploadProgress(0);
    }
  }, [uploadingImageId]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = e.target.getAttribute('data-product-id');
    if (!file || !productId) {
        setUploadingImageId(null);
        setUploadProgress(0);
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreviews(prev => ({ ...prev, [Number(productId)]: reader.result as string }));
    reader.readAsDataURL(file);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await axios.post(`${API_BASE}/products/${productId}/upload-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent: any) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
          },
      });
      const newFullImageUrl = res?.data?.full_url;
      if (newFullImageUrl) {
        setProducts(prev => prev.map(p => 
          p.product_id === Number(productId) ? { ...p, picture_full_url: newFullImageUrl } : p
        ));
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
    } finally {
      setUploadingImageId(null);
      setUploadProgress(0);
    }
  }, []);

  const handleSpecInputChange = useCallback((productId: number, field: keyof ProductSpecs, value: string) => {
    setProductSpecs(prev => ({ ...prev, [productId]: { ...prev[productId], [field]: value }}));
  }, []);

  const handleSaveSpecs = useCallback(async (product: Product) => {
    const productId = product.product_id;
    const currentSpecs = productSpecs[productId];
    if (!currentSpecs) return;
    setSavingSpecId(productId);
    try {
      await axios.put(`${API_BASE}/products/${productId}/specifications`, {
        size: currentSpecs.size,
        length: currentSpecs.length,
        width: currentSpecs.width,
        height: currentSpecs.height ? parseFloat(currentSpecs.height) : null,
        price: currentSpecs.price ? parseFloat(currentSpecs.price) : null,
      });
      setProducts(prev => prev.map(p => p.product_id === productId ? { ...p, specification_value: currentSpecs } : p));
    } catch (error: any) {
      console.error('Error saving specifications:', error);
    } finally {
      setSavingSpecId(null);
    }
  }, [productSpecs]);

  return (
    <DashboardContent>
      <Box className="main-content-header">
        <Typography variant="h3" className="main-title-text">Acute Solution Production Management</Typography>
      </Box>

      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: 2, backgroundColor: 'background.paper', p: 2, borderRadius: '8px', boxShadow: 1 }}>
        <TextField
          label="Search products by name or code..."
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1, maxWidth: { sm: '400px' } }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={handleViewQuotationsClick}>Quotations</Button>
          <Button variant="contained" onClick={handleCreateQuotationClick} startIcon={<Icon icon="material-symbols:add" />}>
            Create Quotation
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 600, overflowY: 'auto', borderRadius: '8px', boxShadow: 1 }}>
        <Table stickyHeader aria-label="product table">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>NAME</TableCell>
              <TableCell>SPECIFICATION</TableCell>
              <TableCell>PRICE</TableCell>
              <TableCell>CATEGORY</TableCell>
              <TableCell>STOCK</TableCell>
              <TableCell>IMAGE</TableCell>
              <TableCell>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && products.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">
                <Typography variant="body1">
                  {appliedFilter ? `No products found matching "${appliedFilter}".` : "No products found."}
                </Typography>
              </TableCell></TableRow>
            ) : (
              products.map((product, index) => {
                const isLast = index + 1 === products.length;
                const displayImageSrc = imagePreviews[product.product_id] || product.picture_full_url || null;
                const currentProductSpecs = productSpecs[product.product_id] || {} as ProductSpecs;
                return (
                  <TableRow ref={isLast ? lastProductElementRef : null} key={product.product_id} hover onClick={() => handleProductRowClick(product)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{product.product_id}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="specification-cell" onClick={e => e.stopPropagation()}>
                      <Box className="specification-inputs-wrapper">
                        <TextField size="small" label="Size" value={currentProductSpecs.size || ''} onChange={e => handleSpecInputChange(product.product_id, 'size', e.target.value)} />
                        <TextField size="small" label="Length" value={currentProductSpecs.length || ''} onChange={e => handleSpecInputChange(product.product_id, 'length', e.target.value)} />
                        <TextField size="small" label="Width" value={currentProductSpecs.width || ''} onChange={e => handleSpecInputChange(product.product_id, 'width', e.target.value)} />
                        <TextField size="small" label="Height" type="number" value={currentProductSpecs.height || ''} onChange={e => handleSpecInputChange(product.product_id, 'height', e.target.value)} />
                        <TextField size="small" label="Price (Spec)" type="number" value={currentProductSpecs.price || ''} onChange={e => handleSpecInputChange(product.product_id, 'price', e.target.value)} />
                        <Button variant="contained" size="small" onClick={e => { e.stopPropagation(); handleSaveSpecs(product); }} disabled={savingSpecId === product.product_id} sx={{ mt: 1 }}>
                          {savingSpecId === product.product_id ? 'Saving...' : 'Submit Specs'}
                        </Button>
                      </Box>
                    </TableCell>
                    <TableCell>₹{parseFloat(String(product.price)).toFixed(2)}</TableCell>
                    <TableCell>{product.category_name}</TableCell>
                    <TableCell>{product.current_stock}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        {displayImageSrc ? (
                          <Box component="img" loading="lazy" src={displayImageSrc} alt={product.name} sx={{ width: 64, height: 64, borderRadius: 1, objectFit: 'cover' }} onClick={e => e.stopPropagation()} />
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>No Image</Typography>
                        )}
                        {uploadingImageId === product.product_id && (
                          <Box sx={{ width: '100%', mt: 0.5 }}>
                              <CircularProgress variant="determinate" value={uploadProgress} size={20} sx={{ display: 'block', mx: 'auto' }} />
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button variant="outlined" size="small" onClick={e => { e.stopPropagation(); handleImageUploadButtonClick(product.product_id); }} disabled={uploadingImageId !== null}>
                        {uploadingImageId === product.product_id ? 'Uploading...' : 'Upload'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*" />
      {loading && products.length > 0 && <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>Loading more...</Typography>}
      {!hasMore && products.length > 0 && !loading && <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>All products loaded.</Typography>}
    </DashboardContent>
  );
}