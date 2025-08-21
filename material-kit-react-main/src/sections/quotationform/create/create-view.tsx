import './create-view.css';

import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import React, { useRef, useState, useEffect, useCallback } from 'react';

import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';

import { ProductItem } from '../../item';

const API_BASE = 'https://acutesolution.in/api';

// --- Type Definitions ---
interface ProductItemData {
    tempId: number;
    pro_id: string;
    pro_dec: string;
    hsn_code: string;
    qty: number;
    mrp: number;
    discount?: number;
    discount_per?: number;
    total: number;
    pro_image_url?: string;
    pro_image_path?: string;
    description_head?: string;
    size?: string;
    colour?: string;
    type?: string;
    thickness?: string;
    length?: string;
    width?: string;
    height?: string;

}

interface CompanyOption {
    id: number;
    label: string; // The Autocomplete component prefers a 'label' property
    contact_person: string;
    contact_no: string; // I'm using contact_no because your FormData uses it
    email_id: string;
}

// <<< UPDATED FormData INTERFACE >>>
interface FormData {
    quotation_id: string;
    quot_no: string;
    lead_id: string;
    date: string;
    company_name: string;
    contact_person_name: string;
    contact_no: string;
    email_id: string;
    address: string;
    billing_pin_code: string;
    billing_building_no: string;
    billing_area: string;
    billing_landmark: string;
    billing_locality: string;
    billing_city: string;
    billing_state: string;
    billing_country: string;
    delivery_pin_code: string;
    delivery_building_no: string;
    delivery_area: string;
    delivery_landmark: string;
    delivery_locality: string;
    delivery_city: string;
    delivery_state: string;
    delivery_country: string;
    status?: string;
    term_condition?: string;
    quotation_sub?: string;
    customer_id: string;

    // --- New Fields for Totals ---
    sub_total: number;
    packaging: string | number;
    loading: string | number;
    transport: string | number;
    unloading: string | number;
    installation: string | number;
    gst_sgst_per: string | number; // Corrected name
    sgst_amount: number;
    gst_cgst_per: string | number; // Corrected name
    cgst_amount: number;
    gst_igst_per: string | number; // Corrected name
    igst_amount: number;
    gst_service_sgst_per: string | number; // Corrected name
    service_sgst_amount: number;
    gst_service_cgst_per: string | number; // Corrected name
    service_cgst_amount: number;
    grand_total: number;
    advance: string | number;
    balance: number;
    transport_type: string;
    transport_in_product: string | number;
    remark: string;
    next_date: string;
    activity: string;

}
// --- End Type Definitions ---

const CreateView = () => {
    const navigate = useNavigate();
    const { quot_no } = useParams<{ quot_no?: string }>();
    const [isEditMode, setIsEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [savedQuotNo, setSavedQuotNo] = useState<string | null>(null);
    const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<readonly CompanyOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');

    // <<< UPDATED formData STATE >>>
    const [formData, setFormData] = useState<FormData>({
        quotation_id: '',
        quot_no: '',
        lead_id: '',
        date: new Date().toISOString().split('T')[0],
        company_name: '',
        contact_person_name: '',
        customer_id: '',
        contact_no: '',
        email_id: '',
        address: '',
        billing_pin_code: '',
        billing_building_no: '',
        billing_area: '',
        billing_landmark: '',
        billing_locality: '',
        billing_city: '',
        billing_state: '',
        billing_country: '',
        delivery_pin_code: '',
        delivery_building_no: '',
        delivery_area: '',
        delivery_landmark: '',
        delivery_locality: '',
        delivery_city: '',
        delivery_state: '',
        delivery_country: '',
        status: 'draft',
        term_condition: '',
        quotation_sub: '',
        // --- Initial values for new fields ---
        sub_total: 0,
        packaging: '',
        loading: '',
        transport: '',
        unloading: '',
        installation: '',

        gst_sgst_per: '',      // Corrected Name
        sgst_amount: 0,
        gst_cgst_per: '',      // Corrected Name
        cgst_amount: 0,
        gst_igst_per: '',      // Corrected Name
        igst_amount: 0,
        gst_service_sgst_per: '', // Corrected Name
        service_sgst_amount: 0,
        gst_service_cgst_per: '', // Corrected Name
        service_cgst_amount: 0,

        grand_total: 0,
        advance: '',
        balance: 0,

        remark: '',
        next_date: '',
        activity: '',
        transport_type: '',
        transport_in_product: '',

    });


    const [products, setProducts] = useState<ProductItemData[]>([]);

    // Effect to determine mode (create/edit) and fetch initial data
    useEffect(() => {
        // This part handles EDIT mode when a quot_no is in the URL. It's already correct.
        if (quot_no) {
            setIsEditMode(true);
            setSavedQuotNo(quot_no);

            const fetchQuotationData = async () => {
                try {
                    const response = await axios.get(`${API_BASE}/quotations/${quot_no}`);
                    const fetchedData = response.data.data;

                    // Your existing logic to set form data for editing is correct
                    setFormData(prev => ({
                        ...prev,
                        quotation_id: fetchedData.quotation_id?.toString() || '',
                        quot_no: fetchedData.quot_no || '',
                        lead_id: fetchedData.lead_id?.toString() || '',
                        date: fetchedData.date || new Date().toISOString().split('T')[0],
                        company_name: fetchedData.company_name || '',
                        contact_person_name: fetchedData.contact_person_name || '',
                        contact_no: fetchedData.contact_no || '',
                        email_id: fetchedData.email_id || '',
                        address: fetchedData.address || '',
                        billing_pin_code: fetchedData.billing_pin_code || '',
                        billing_building_no: fetchedData.billing_building_no || '',
                        billing_area: fetchedData.billing_area || '',
                        billing_landmark: fetchedData.billing_landmark || '',
                        billing_locality: fetchedData.billing_locality || '',
                        billing_city: fetchedData.billing_city || '',
                        billing_state: fetchedData.billing_state || '',
                        billing_country: fetchedData.billing_country || '',
                        delivery_pin_code: fetchedData.delivery_pin_code || '',
                        delivery_building_no: fetchedData.delivery_building_no || '',
                        delivery_area: fetchedData.delivery_area || '',
                        delivery_landmark: fetchedData.delivery_landmark || '',
                        delivery_locality: fetchedData.delivery_locality || '',
                        delivery_city: fetchedData.delivery_city || '',
                        delivery_state: fetchedData.delivery_state || '',
                        delivery_country: fetchedData.delivery_country || '',
                        status: fetchedData.status || 'draft',
                        term_condition: fetchedData.term_condition || '',
                        quotation_sub: fetchedData.quotation_sub || '',
                        packaging: Number(fetchedData.packaging) || 0,
                        loading: Number(fetchedData.loading) || 0,
                        transport: Number(fetchedData.transport) || 0,
                        unloading: Number(fetchedData.unloading) || 0,
                        installation: Number(fetchedData.installation) || 0,
                        sgst_per: Number(fetchedData.sgst_per) || 9,
                        cgst_per: Number(fetchedData.cgst_per) || 9,
                        advance: Number(fetchedData.advance) || 0,
                    }));

                    if (fetchedData.products && Array.isArray(fetchedData.products)) {
                        setProducts(fetchedData.products.map((p: ProductItemData) => ({
                            ...p,
                            tempId: Date.now() + Math.random(),
                            qty: Number(p.qty) || 1,
                            mrp: Number(p.mrp) || 0,
                            total: Number(p.total) || 0,
                        })));
                    } else {
                        setProducts([]);
                    }

                } catch (fetchError: any) {
                    console.error("Failed to fetch quotation data:", fetchError);
                    setError("Could not load quotation data for editing.");
                }
            };
            fetchQuotationData();
        }
        // This part handles CREATE mode when there is NO quot_no in the URL.
        else {
            // This `else` block RESETS the form to its initial, empty state
            setIsEditMode(false);
            setSavedQuotNo(null);
            setProducts([]);
            setFormData({
                quotation_id: '',
                quot_no: '',
                lead_id: '',
                date: new Date().toISOString().split('T')[0],
                company_name: '',
                contact_person_name: '',
                customer_id: '',
                contact_no: '',
                email_id: '',
                address: '',
                billing_pin_code: '',
                billing_building_no: '',
                billing_area: '',
                billing_landmark: '',
                billing_locality: '',
                billing_city: '',
                billing_state: '',
                billing_country: '',
                delivery_pin_code: '',
                delivery_building_no: '',
                delivery_area: '',
                delivery_landmark: '',
                delivery_locality: '',
                delivery_city: '',
                delivery_state: '',
                delivery_country: '',
                status: 'draft',
                term_condition: '',
                quotation_sub: '',
                sub_total: 0,
                packaging: '',
                loading: '',
                transport: '',
                unloading: '',
                installation: '',
                gst_sgst_per: '',
                sgst_amount: 0,
                gst_cgst_per: '',
                cgst_amount: 0,
                gst_igst_per: '',
                igst_amount: 0,
                gst_service_sgst_per: '',
                service_sgst_amount: 0,
                gst_service_cgst_per: '',
                service_cgst_amount: 0,
                grand_total: 0,
                advance: '',
                balance: 0,
                remark: '',
                next_date: '',
                activity: '',
                transport_type: '',
                transport_in_product: '',
            });
        }
    }, [quot_no]); 
    // Auto-save logic
    useEffect(() => {
        if (!isEditMode && (!formData.quot_no && !formData.company_name)) {
            return;
        }
        if (autoSaveTimeout.current) {
            clearTimeout(autoSaveTimeout.current);
        }
        autoSaveTimeout.current = setTimeout(async () => {
            const payload = { ...formData, products: products.map(({ tempId, ...p }) => p), status: 'draft' };
            try {
                let response;
                if (savedQuotNo) {
                    response = await axios.put(`${API_BASE}/quotations/${savedQuotNo}`, payload);
                } else {
                    response = await axios.post(`${API_BASE}/quotations`, payload);
                }
                if (response.data && response.data.quot_no) {
                    setSavedQuotNo(response.data.quot_no);
                }
            } catch (err: any) {
                console.error('Auto-save failed:', err.response?.data || err.message);
            }
        }, 2000);

        return () => {
            if (autoSaveTimeout.current) {
                clearTimeout(autoSaveTimeout.current);
            }
        };
    }, [formData, products, savedQuotNo, isEditMode]);

    // In CreateView.tsx

    // This useEffect handles the debounced API call for searching
    useEffect(() => {
        let active = true;
        if (inputValue.trim() === '') {
            setOptions([]);
            return undefined;
        }

        const debounceTimer = setTimeout(async () => {
            setLoading(true);
            try {
                // Note: I'm assuming your API returns all the details
                const response = await axios.get(`${API_BASE}/companies/search?q=${inputValue}`);

                if (active) {
                    // ✅ Store the full company object, not just id and label
                    const formattedOptions = response.data.map((company: {
                        id: number;
                        company_name: string;
                        contact_person: string;
                        contact_no1: string; // Assuming the API returns contact_no1
                        email: string;      // Assuming the API returns 'email'
                    }) => ({
                        id: company.id,
                        label: company.company_name,
                        contact_person: company.contact_person,
                        contact_no: company.contact_no1, // Map API field to our state field
                        email_id: company.email,         // Map API field to our state field
                    }));
                    setOptions(formattedOptions);
                }
                // eslint-disable-next-line @typescript-eslint/no-shadow
            } catch (error) {
                console.error("Failed to fetch companies:", error);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }, 500);

        return () => {
            active = false;
            clearTimeout(debounceTimer);
        };
    }, [inputValue]);

    // In CreateView.tsx

    // in CreateView.tsx
    const handleTransportTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Update the dropdown's value
        setFormData(prev => ({ ...prev, [name]: value }));

        // Logic to clear the other input when switching
        if (value === 'By Customer') {
            setFormData(prev => ({ ...prev, transport: 0, transport_in_product: '' }));
        } else if (value === 'Include In Product') {
            setFormData(prev => ({ ...prev, transport: 0 }));
        } else {
            setFormData(prev => ({ ...prev, transport_in_product: '' }));
        }
    };




    useEffect(() => {
        const subTotal = products.reduce((acc, product) => acc + product.total, 0);

        const packaging = Number(formData.packaging) || 0;
        // eslint-disable-next-line @typescript-eslint/no-shadow
        const loading = Number(formData.loading) || 0;
        const transport = Number(formData.transport) || 0;
        const unloading = Number(formData.unloading) || 0;
        const installation = Number(formData.installation) || 0;


        const sgstAmount = (subTotal * (Number(formData.gst_sgst_per) || 0)) / 100;
        const cgstAmount = (subTotal * (Number(formData.gst_cgst_per) || 0)) / 100;
        const igstAmount = (subTotal * (Number(formData.gst_igst_per) || 0)) / 100;
        const serviceSgstAmount = (subTotal * (Number(formData.gst_service_sgst_per) || 0)) / 100;
        const serviceCgstAmount = (subTotal * (Number(formData.gst_service_cgst_per) || 0)) / 100;


        const grandTotal = subTotal + packaging + loading + transport + unloading + installation +
            sgstAmount + cgstAmount + igstAmount + serviceSgstAmount + serviceCgstAmount;

        const advance = Number(formData.advance) || 0;
        const balance = grandTotal - advance;


        setFormData(prev => ({
            ...prev,
            sub_total: parseFloat(subTotal.toFixed(2)),
            sgst_amount: parseFloat(sgstAmount.toFixed(2)),
            cgst_amount: parseFloat(cgstAmount.toFixed(2)),
            igst_amount: parseFloat(igstAmount.toFixed(2)),
            service_sgst_amount: parseFloat(serviceSgstAmount.toFixed(2)),
            service_cgst_amount: parseFloat(serviceCgstAmount.toFixed(2)),
            grand_total: parseFloat(grandTotal.toFixed(2)),
            balance: parseFloat(balance.toFixed(2)),
        }));

    }, [
        products, formData.packaging, formData.loading, formData.transport, formData.unloading,
        formData.installation, formData.gst_sgst_per, formData.gst_cgst_per, formData.gst_igst_per,
        formData.gst_service_sgst_per, formData.gst_service_cgst_per, formData.advance
    ]);

    // In CreateView.tsx, after your useState hooks

    useEffect(() => {
        // Calculate the sum of all product totals
        const newSubTotal = products.reduce((accumulator, currentProduct) => accumulator + currentProduct.total, 0);

        // Update the sub_total in the form data
        setFormData(prev => ({
            ...prev,
            sub_total: newSubTotal
        }));

    }, [products]); // <-- This dependency array makes the code run whenever 'products' changes


    const addProductItem = () => {
        setProducts(prev => [...prev, { tempId: Date.now(), pro_id: '', pro_dec: '', hsn_code: '', qty: 1, mrp: 0, total: 0 }]);
    };

    const removeProductItem = (tempId: number) => {
        setProducts(prev => prev.filter(p => p.tempId !== tempId));
    };

    // useCallback hata diya gaya hai
    const updateProductItem = (tempId: number, field: string, value: any) => {
        setProducts(prev => prev.map(p => {
            if (p.tempId === tempId) {
                // ... baaki ka logic waisa hi rahega
                const updatedProduct = { ...p, [field]: value };
                const qty = Number(updatedProduct.qty) || 0;
                const mrp = Number(updatedProduct.mrp) || 0;
                const discount = Number(updatedProduct.discount || 0);
                const discount_per = Number(updatedProduct.discount_per || 0);
                let calculatedTotal = mrp * qty;
                if (discount_per > 0) {
                    calculatedTotal -= (calculatedTotal * discount_per / 100);
                } else if (discount > 0) {
                    calculatedTotal -= discount;
                }
                updatedProduct.total = parseFloat(Math.max(0, calculatedTotal).toFixed(2));
                return updatedProduct;
            }
            return p;
        }));
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (autoSaveTimeout.current) {
            clearTimeout(autoSaveTimeout.current);
        }
        setSaving(true);
        setError(null);

        if (products.length === 0) {
            setError("Please add at least one product item to the quotation.");
            setSaving(false);
            return;
        }

        const payload = { ...formData, products: products.map(({ tempId, ...p }) => p), status: 'final' };

        try {
            let response;
            if (isEditMode || savedQuotNo) {
                const identifierForUpdate = quot_no || savedQuotNo;
                if (!identifierForUpdate) {
                    setError("Cannot update: Quotation Number is missing.");
                    setSaving(false);
                    return;
                }
                response = await axios.put(`${API_BASE}/quotations/${identifierForUpdate}`, payload);
            } else {
                response = await axios.post(`${API_BASE}/quotations`, payload);
            }
            if (response.data && response.data.quot_no) {
                setSavedQuotNo(response.data.quot_no);
            }
            setOpenSnackbar(true);
        } catch (err: any) {
            console.error('Error:', err.response?.data || err.message);
            setError(`Failed to save quotation. ${err.response?.data?.message || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setOpenSnackbar(false);

        // navigate ka istemal karein, lekin alag-alag
        if (savedQuotNo) {
            navigate(`/quotations/preview/${encodeURIComponent(savedQuotNo)}`); // 'quotation' ko 'quotations' kar diya
        } else {
            navigate('/quotations');
        }
    };

    return (
        <div className="quotation-form-container">
            <div className="form-header">
                <h1>{isEditMode ? `Edit Quotation ${quot_no}` : 'Create New Quotation'}</h1>
                {savedQuotNo && !isEditMode && <span className="draft-status">Draft Saved for Quotation No: {savedQuotNo}</span>}
                <button type="button" onClick={() => navigate('/quotations')} className="back-button">
                    Back to Quotations List
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="quotation-form">
                <div className="form-section-main">

                    {/* Row 1: Quotation No. and Date */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Quotation No:</label>
                            <input
                                type="text"
                                name="quot_no"
                                value={formData.quot_no}
                                onChange={handleChange}
                                required={!isEditMode}
                                readOnly={isEditMode}
                                style={isEditMode ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
                            />
                        </div>
                        <div className="form-group">
                            <label>Date:</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    {/* Row 2: Lead ID and Company Name */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Lead ID:</label>
                            <input
                                type="text"
                                name="lead_id"
                                value={formData.lead_id}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Company Name:</label>
                            <Autocomplete
                                id="company-autocomplete"
                                open={open}
                                onOpen={() => setOpen(true)}
                                onClose={() => setOpen(false)}
                                options={options}
                                loading={loading}
                                onInputChange={(event, newInputValue) => {
                                    setInputValue(newInputValue);
                                }}
                                onChange={(event, selectedOption: CompanyOption | null) => {
                                    if (selectedOption) {
                                        setFormData(prev => ({
                                            ...prev,
                                            customer_id: selectedOption.id.toString(),
                                            company_name: selectedOption.label,
                                            contact_person_name: selectedOption.contact_person || '',
                                            contact_no: selectedOption.contact_no || '',
                                            email_id: selectedOption.email_id || '',
                                        }));
                                    } else {
                                        setFormData(prev => ({
                                            ...prev,
                                            customer_id: '',
                                            company_name: '',
                                            contact_person_name: '',
                                            contact_no: '',
                                            email_id: '',
                                        }));
                                    }
                                }}
                                getOptionLabel={(option) => option.label}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Search Company Name..."
                                        size="small"
                                        sx={{
                                            '& .MuiInputBase-input': { padding: '4px 8px !important' },
                                            '& .MuiOutlinedInput-root': { padding: '1px !important' }
                                        }}
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
                        </div>
                    </div>

                    {/* Row 3: Company ID and Contact Person */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Company ID:</label>
                            <input
                                type="text"
                                name="company_id_display"
                                value={formData.customer_id}
                                readOnly
                                style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Contact Person:</label>
                            <input
                                type="text"
                                name="contact_person_name"
                                value={formData.contact_person_name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Row 4: Contact No and Email ID */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Contact No:</label>
                            <input
                                type="text"
                                name="contact_no"
                                value={formData.contact_no}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Email ID:</label>
                            <input
                                type="email"
                                name="email_id"
                                value={formData.email_id}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                </div>
                <div className="address-section-wrapper">
                    <div className="address-section">
                        <h3>Billing Address</h3>
                        <div className="form-group"><label>PIN CODE:</label><input type="text" name="billing_pin_code" value={formData.billing_pin_code} onChange={handleChange} /></div>
                        <div className="form-group"><label>Building, House No, Apartment:</label><textarea name="billing_building_no" value={formData.billing_building_no} onChange={handleChange} /></div>
                        <div className="form-group"><label>City:</label><input type="text" name="billing_city" value={formData.billing_city} onChange={handleChange} /></div>
                        <div className="form-group"><label>State:</label><input type="text" name="billing_state" value={formData.billing_state} onChange={handleChange} /></div>
                        <div className="form-group"><label>Country:</label><input type="text" name="billing_country" value={formData.billing_country} onChange={handleChange} /></div>
                    </div>
                    <div className="address-section">
                        <h3>Delivery Address</h3>
                        <div className="form-group"><label>PIN CODE:</label><input type="text" name="delivery_pin_code" value={formData.delivery_pin_code} onChange={handleChange} /></div>
                        <div className="form-group"><label>Building, House No, Apartment:</label><textarea name="delivery_building_no" value={formData.delivery_building_no} onChange={handleChange} /></div>
                        <div className="form-group"><label>City:</label><input type="text" name="delivery_city" value={formData.delivery_city} onChange={handleChange} /></div>
                        <div className="form-group"><label>State:</label><input type="text" name="delivery_state" value={formData.delivery_state} onChange={handleChange} /></div>
                        <div className="form-group"><label>Country:</label><input type="text" name="delivery_country" value={formData.delivery_country} onChange={handleChange} /></div>
                    </div>
                </div>




                <div className="product-line-items-section">
                    <h3>Products</h3>
                    <div className="line-item-header">
                        <span>S.No.</span> <span>Product</span> <span>Product Image</span>
                        <span>Description</span> <span>Specification</span> <span>Price</span>
                        <span>Qty</span> <span>Discount</span> <span>Discount%</span>
                        <span>Total</span> <span>Remove</span>
                    </div>
                    {products.map((item, index) => (
                        <ProductItem
                            key={item.tempId} item={item} index={index}
                            updateItem={updateProductItem} removeItem={removeProductItem}
                        />
                    ))}
                    <button type="button" onClick={addProductItem} className="add-product-btn">+ Add Product</button>
                </div>



                <div className="summary-and-totals-wrapper">

                    <div className="activity-section">
                        <div className="form-group">
                            <label>Remark:</label>
                            <textarea
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                placeholder="Add a remark..."
                            />
                        </div>
                        <div className="form-group">
                            <label>Next Date:</label>
                            <input
                                type="date"
                                name="next_date"
                                value={formData.next_date}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Activity:</label>
                            <textarea
                                name="activity"
                                value={formData.activity}
                                onChange={handleChange}
                                placeholder="Describe the activity..."
                            />
                        </div>
                    </div>


                    <div className="totals-section">

                        <div className="form-group-total">
                            <label>Sub Total:</label>
                            <input
                                type="text"
                                value={formData.sub_total.toFixed(2)}
                                readOnly
                            />
                        </div>
                        <div className="form-group-total">
                            <label>Packaging:</label>
                            <input type="number" name="packaging" value={formData.packaging} onChange={handleChange} />
                        </div>
                        <div className="form-group-total">
                            <label>Loading:</label>
                            <input type="number" name="loading" value={formData.loading} onChange={handleChange} />
                        </div>
                        <div className="form-group-total">
                            <label>Transport/Courier:</label>
                            <div className="input-group">
                                <input
                                    type="number"
                                    name="transport"
                                    value={formData.transport}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className="transport-input"
                                    // ✅ Only show this input if the type is NOT 'Include In Product' or 'By Customer'
                                    style={{ visibility: (formData.transport_type === 'Include In Product' || formData.transport_type === 'By Customer') ? 'hidden' : 'visible' }}
                                />
                                <select
                                    name="transport_type"
                                    value={formData.transport_type}
                                    className="transport-select"
                                    onChange={handleTransportTypeChange}
                                >
                                    <option value="">Select</option>
                                    <option value="By Customer">By Customer</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Include In Product">Include In Product</option>
                                    <option value="At Actual">At Actual</option>
                                </select>
                            </div>
                        </div>

                        {/* ✅ Create a separate form group for the conditional input */}
                        {formData.transport_type === 'Include In Product' && (
                            <div className="form-group-total">
                                <label>How much?</label>
                                <input
                                    type="number"
                                    name="transport_in_product"
                                    value={formData.transport_in_product}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                />
                            </div>
                        )}
                        <div className="form-group-total">
                            <label>Unloading:</label>
                            <input type="number" name="unloading" value={formData.unloading} onChange={handleChange} />
                        </div>
                        <div className="form-group-total">
                            <label>Installation:</label>
                            <input type="number" name="installation" value={formData.installation} onChange={handleChange} />
                        </div>
                        <div className="form-group-total gst-group">
                            <label>SGST (%):</label>
                            <input type="number" placeholder="SGST %" name="gst_sgst_per" value={formData.gst_sgst_per} onChange={handleChange} className="gst-percent" />
                            <input type="text" placeholder='SGST' value={formData.sgst_amount.toFixed(2)} readOnly className="gst-amount" />
                        </div>
                        <div className="form-group-total gst-group">
                            <label>CGST (%):</label>
                            <input type="number" placeholder="CGST %" name="gst_cgst_per" value={formData.gst_cgst_per} onChange={handleChange} className="gst-percent" />
                            <input type="text" placeholder='CGST' value={formData.cgst_amount.toFixed(2)} readOnly className="gst-amount" />
                        </div>
                        <div className="form-group-total gst-group">
                            <label>IGST (%):</label>
                            <input type="number" placeholder="IGST %" name="gst_igst_per" value={formData.gst_igst_per} onChange={handleChange} className="gst-percent" />
                            <input type="text" placeholder='IGST' value={formData.igst_amount.toFixed(2)} readOnly className="gst-amount" />
                        </div>
                        <div className="form-group-total gst-group">
                            <label>Service SGST (%):</label>
                            <input type="number" placeholder="Service SGST %" name="gst_service_sgst_per" value={formData.gst_service_sgst_per} onChange={handleChange} className="gst-percent" />
                            <input type="text" placeholder=' Service SGST' value={formData.service_sgst_amount.toFixed(2)} readOnly className="gst-amount" />
                        </div>
                        <div className="form-group-total gst-group">
                            <label>Service CGST (%):</label>
                            <input type="number" placeholder="Service CGST %" name="gst_service_cgst_per" value={formData.gst_service_cgst_per} onChange={handleChange} className="gst-percent" />
                            <input type="text" placeholder='Service CGST' value={formData.service_cgst_amount.toFixed(2)} readOnly className="gst-amount" />
                        </div>
                        <div className="form-group-total grand-total">
                            <label>Grand Total:</label>
                            <input type="text" value={formData.grand_total.toFixed(2)} readOnly />
                        </div>
                        <div className="form-group-total">
                            <label>Advance:</label>
                            <input type="number" name="advance" value={formData.advance} onChange={handleChange} />
                        </div>
                        <div className="form-group-total balance-total">
                            <label>Balance:</label>
                            <input type="text" value={formData.balance.toFixed(2)} readOnly />
                        </div>
                    </div>

                </div>


                <div className="declaration-section">
                    <label className="terms-checkbox-label">
                        <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
                        I Agree to the terms and conditions.
                    </label>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={saving || !agreedToTerms}>
                        {saving ? 'Saving...' : (isEditMode ? 'Update Quotation' : 'Create Quotation')}
                    </button>
                </div>
            </form>

            <Snackbar
                open={openSnackbar}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity="success"
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    Quotation {isEditMode ? 'updated' : 'created'} successfully!
                </Alert>
            </Snackbar>
        </div>
    );
};

export default CreateView;
