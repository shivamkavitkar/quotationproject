import './create-preview.css';

import axios from 'axios';
// Removed 'useRef' as it was unused.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// --- Type Definitions (Moved to top for proper scope and visibility) ---
// Please ensure these interfaces accurately reflect your API's expected and returned data
interface ProductItemData {
    // These should match the fields returned in the 'products' array from your Laravel `show` method
    tempId?: number | string; // Using tempId as it's provided by backend now
    pro_id?: string;
    pro_code?: string; // Add if returned by backend
    pro_dec: string;
    description_head?: string;
    hsn_code?: string;
    qty: number;
    mrp: number;
    discount?: number;
    discount_per?: number;
    total: number;
    pro_image_url?: string;
    pro_image_path?: string; // Original path for backend reference
    size?: string;
    colour?: string;
    type?: string; // If this is a product-specific type
    thickness?: string;
    length?: string; // Add if returned by backend
    width?: string; // Add if returned by backend
    height?: string; // Add if returned by backend
    // Add any other product-related fields returned by your backend's show method
}

interface QuotationHeaderData {
    // These should match the top-level fields returned by your Laravel `show` method
    quotation_id?: number | string; // This is the quot_id from the first row
    quot_no: string;
    date: string; // Formatted as 'YYYY-MM-DD' from backend
    valid_until?: string; // If you have this field in your DB and return it
    company_name?: string | null; // From customer relationship
    contact_person_name?: string | null;
    contact_no?: string | null;
    email_id?: string | null;
    address?: string | null; // General address field if applicable
    billing_building_no?: string | null;
    billing_area?: string | null;
    billing_landmark?: string | null;
    billing_locality?: string | null;
    billing_city?: string | null;
    billing_state?: string | null;
    billing_pin_code?: string | null;
    billing_country?: string | null;
    delivery_building_no?: string | null;
    delivery_area?: string | null;
    delivery_landmark?: string | null;
    delivery_locality?: string | null;
    delivery_city?: string | null;
    delivery_state?: string | null;
    delivery_country?: string | null;
    delivery_pin_code?: string | null;
    status?: string; // Added status as it's returned by backend
    term_condition?: string | null;
    quotation_sub?: string | null;
    // Add other top-level fields that your backend `show` method returns
    subtotal?: number; // These should be directly from backend calculation if used
    allover_discount?: number;
    grand_total?: number;
}

// The main data structure from the API should be a single object
interface FullQuotationResponseData extends QuotationHeaderData {
    products: ProductItemData[]; // Array of product items
}
// --- End Type Definitions ---

const API_BASE = '/api'; // Using Vite proxy. Keep this as '/api'.

const PreviewView = () => { // Or CreatePreviewView depending on your current exact component name
    const { quot_no } = useParams<{ quot_no: string }>();
    const navigate = useNavigate();

    // Change state type to a single object or null to match backend response
    const [quotationData, setQuotationData] = useState<FullQuotationResponseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageLoadStatus, setImageLoadStatus] = useState<{ [itemId: string]: 'loaded' | 'failed' | 'loading' }>({});

    useEffect(() => {
        const fetchQuotationDetails = async () => {
            setLoading(true);
            setError(null);
            setImageLoadStatus({}); // Reset image load status on new fetch

            if (!quot_no) {
                setError("Quotation number not provided in URL.");
                setLoading(false);
                return;
            }

            try {
                // Expect a single object with a nested 'products' array under 'data' key
                const response = await axios.get<{ data: FullQuotationResponseData }>(`${API_BASE}/quotations/${quot_no}`);

                if (response.data && response.data.data && response.data.data.products) {
                    setQuotationData(response.data.data); // Set the entire object to state
                } else {
                    // Handle cases where data or products array is missing/empty
                    setError(`Quotation '${quot_no}' not found or has no items.`);
                    setQuotationData(null);
                }
            } catch (err: any) {
                console.error('Error fetching quotation details:', err.response ? err.response.data : err.message);
                const errorMessage = err.response?.data?.message
                    ? err.response.data.message
                    : 'Failed to load quotation details. Please check the quotation number or server connection.';
                setError(errorMessage);
                setQuotationData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchQuotationDetails();
    }, [quot_no]); // Dependency array: Re-run when quot_no changes

    if (loading) {
        return (
            <div className="quotation-preview-container loading-message-container">
                <div className="loading-message">Loading quotation...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="quotation-preview-container error-message-container">
                <div className="error-message">Error: {error}</div>
                <button onClick={() => navigate('/quotations')} className="back-button" style={{ marginLeft: '10px' }}>Back to List</button>
            </div>
        );
    }

    // Now, quotationData is a single object, not an array.
    // Check if it's null or if its nested products array is empty.
    if (!quotationData || !quotationData.products || quotationData.products.length === 0) {
        return (
            <div className="quotation-preview-container no-data-message-container">
                <div className="no-data-message">No data found for this quotation.</div>
                <button onClick={() => navigate('/quotations')} className="back-button" style={{ marginTop: '10px' }}>Back to List</button>
            </div>
        );
    }

    // Access header properties directly from quotationData
    const header: QuotationHeaderData = quotationData;
    // Access items from the nested products array
    const items: ProductItemData[] = quotationData.products;

    // Calculate grand total if not provided by backend as a top-level field
    const grandTotalCalculated = items.reduce((sum, currentItem) =>
        sum + (parseFloat(currentItem.total?.toString() || '0') || 0)
        , 0).toFixed(2);

    const handleImageLoad = (itemId: number | string) => {
        setImageLoadStatus(prevStatus => ({
            ...prevStatus,
            [itemId]: 'loaded' as const // Use 'as const' for literal type
        }));
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, itemId: number | string) => {
        (e.target as HTMLImageElement).onerror = null; // Prevent infinite loop on broken images
        setImageLoadStatus(prevStatus => ({
            ...prevStatus,
            [itemId]: 'failed' as const // Use 'as const' for literal type
        }));
    };

    return (
        <div className="quotation-preview-container">
            {/* --- Action Buttons (Back and Print) --- */}
            <div className="preview-actions">
                <button
                    type="button"
                    onClick={() => navigate('/quotations')}
                    className="back-to-quotations-btn"
                >
                    ← Back to Quotations
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="print-quotation-btn"
                >
                    🖨️ Print Quotation
                </button>
            </div>

            {/* --- Main Quotation Header (Title only - Logo removed) --- */}
            <div className="quotation-main-header">
                <div className="quotation-title">QUOTATION</div>
                {/* LOGO REMOVED: If you want a logo, add it back here:
                    <div className="company-logo"> <img src={logo} alt="Company Logo" /> </div>
                */}
            </div>

            {/* --- Quotation Meta Information (Date, Quote#, Valid Until) --- */}
            <div className="quotation-meta-info-section">
                <div><span>Date:</span> {header.date ? new Date(header.date).toLocaleDateString() : 'N/A'}</div>
                <div><span>Quote#:</span> {header.quot_no || 'N/A'}</div>
                {/* Ensure 'valid_until' is correctly returned by your backend if needed */}
                {header.valid_until && <div><span>Valid Until:</span> {new Date(header.valid_until).toLocaleDateString()}</div>}
            </div>

            {/* --- Customer Information Section (TO: address) --- */}
            <div className="customer-info-section">
                <h3>TO:</h3>
                {/* Assuming company_name is now directly available in header from backend's responsePayload */}
                <p><strong>{header.company_name || 'N/A Company'}</strong></p>
                <p>{header.contact_person_name || 'N/A'}</p>
                <p>
                    {[header.billing_building_no, header.billing_area, header.billing_landmark]
                        .filter(Boolean)
                        .join(', ') || 'N/A Address Line 1'}
                </p>
                <p>
                    {[header.billing_locality, header.billing_city, header.billing_state, header.billing_pin_code]
                        .filter(Boolean)
                        .join(', ') || 'N/A Address Line 2'}
                </p>
                <p>Phone: {header.contact_no || 'N/A'}</p>
                <p>Email: {header.email_id || 'N/A'}</p>
            </div>

            {/* --- Products Table Section --- */}
            <div className="product-items-table-wrapper">
                <table className="product-items-table">
                    <thead>
                        <tr>
                            <th>ITEM/DESCRIPTION</th>
                            <th>Image</th>
                            <th>HSN CODE</th>
                            <th>QTY</th>
                            <th>UNIT PRICE</th>
                            <th>DISCOUNT</th>
                            <th>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            // Use item.tempId if provided by backend (from quot_id), otherwise fall back to index
                            const itemId = item.tempId || `item-${idx}`;
                            const currentImageStatus = imageLoadStatus[itemId] || 'loading';

                            const displaySrc = (currentImageStatus === 'failed' || !item.pro_image_url)
                                ? "/placeholder-image.png" // Use placeholder if image fails to load or URL is missing
                                : item.pro_image_url;

                            return (
                                <tr key={itemId}>
                                    <td className="item-description-cell">
                                        <strong>{item.pro_dec || 'No Description'}</strong>
                                        {item.description_head && <div className="sub-description">{item.description_head}</div>}
                                        {(item.size || item.colour || item.type || item.thickness || item.length || item.width || item.height) && (
                                            <div className="product-specs">
                                                {item.size && <span>Size: {item.size}</span>}
                                                {item.colour && <span>Color: {item.colour}</span>}
                                                {item.type && <span>Type: {item.type}</span>}
                                                {item.thickness && <span>Thickness: {item.thickness}</span>}
                                                {item.length && <span>Length: {item.length}</span>}
                                                {item.width && <span>Width: {item.width}</span>}
                                                {item.height && <span>Height: {item.height}</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="product-image-cell">
                                        <img
                                            src={displaySrc}
                                            alt={item.pro_dec || 'Product Image'}
                                            className={`product-item-thumbnail ${currentImageStatus === 'failed' ? 'broken-image' : ''}`}
                                            onLoad={() => handleImageLoad(itemId)}
                                            onError={(e) => handleImageError(e, itemId)}
                                        />
                                        {!item.pro_image_url && currentImageStatus !== 'loading' && (
                                            <div className="no-image-placeholder-small">No Image</div>
                                        )}
                                    </td>
                                    <td>{item.hsn_code || 'N/A'}</td>
                                    <td className="qty-cell">{parseFloat(item.qty?.toString() || '0').toFixed(2)}</td>
                                    <td className="price-cell">₹{parseFloat(item.mrp?.toString() || '0').toFixed(2)}</td>
                                    <td className="discount-cell">
                                        {item.discount && item.discount > 0 ? `₹${parseFloat(item.discount.toString()).toFixed(2)}` :
                                            (item.discount_per && item.discount_per > 0 ? `${parseFloat(item.discount_per.toString()).toFixed(2)}%` : '0.00')}
                                    </td>
                                    <td className="total-cell">₹{parseFloat(item.total?.toString() || '0').toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- Quotation Summary Section --- */}
            <div className="quotation-summary-section">
                {/* Use the header.subtotal if available from backend, otherwise calculate */}
                {/* Assuming `subtotal` and `allover_discount` are returned as top-level fields by backend */}
                {header.subtotal && header.subtotal > 0 && <div><span>Subtotal:</span> ₹{parseFloat(header.subtotal.toString()).toFixed(2)}</div>}
                {header.allover_discount && header.allover_discount > 0 && <div><span>Total Discount:</span> ₹{parseFloat(header.allover_discount.toString()).toFixed(2)}</div>}
                {/* Use header.grand_total if available, otherwise use calculated */}
                <div><span>Grand Total:</span> ₹{header.grand_total ? parseFloat(header.grand_total.toString()).toFixed(2) : grandTotalCalculated}</div>
            </div>

            {/* --- QR Code and Signature Section --- */}
            <div className="qr-signature-section">
                <div className="qr-code-area">
                    <h4>Scan to Pay:</h4>
                    {/* Placeholder QR code image */}
                    <img src="https://www.bing.com/th/id/OIP.TrZAcqeXKtaRJHxTJkTJxwHaHa?w=181&h=211&c=8&rs=1&qlt=90&o=6&pid=3.1&rm=2" alt="QR Code for Payment" className="qr-code-image" />
                    <p className="qr-label">UPI ID: shivamkavitkar11@hdfcbank</p>
                </div>

                <div className="signature-area">
                    <div className="signature-line" />
                    <p>For **Acute Solution**</p>
                    <p className="authorized-signatory">Authorized Signatory</p>
                </div>
            </div>

            {/* --- Terms & Conditions Section --- */}
            <div className="terms-conditions-section">
                <h4>Terms & Conditions:</h4>
                <p>{header.term_condition || 'Standard terms and conditions apply. Payments are due upon receipt unless otherwise agreed. All prices are exclusive of applicable taxes unless stated otherwise.'}</p>
            </div>
        </div>



    );
};

export default PreviewView;