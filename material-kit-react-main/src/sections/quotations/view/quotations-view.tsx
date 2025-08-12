import './quotations-view.css';

import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
// FontAwesome Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { faEye, faPlus, faTrash, faTimes, faPrint, faHistory, faPencilAlt } from '@fortawesome/free-solid-svg-icons';

import { Searchbar } from '../../../layouts/components/searchbar';

const API_BASE = '/api';

// --- Type Interfaces ---
interface QuotationHistoryItem {
    id: number;
    quot_id: number;
    quot_no: string;
    date: string;
    grand_total: number;
}

interface QuotationRow {
    id: number;
    quot_id: number;
    quot_no: string;
    date: string;
    company_name: string;
    customer_id: number;
    contact_person_name: string | null;
    contact_no: string | null;
    lead_id: number | null;
    status: 'draft' | 'final';
    grand_total: number;
    quotation_history: QuotationHistoryItem[];
    lead_status: string; // New
    activity: string; // New
    lead_priority: string; // New
    created_date: string | null; // New
    next_date: string | null; // New
    activity_next_date?: string;
}

const QuotationsView = () => {
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState<QuotationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [historyVisible, setHistoryVisible] = useState<Record<string, boolean>>({});

    const observer = useRef<IntersectionObserver | null>(null);

    const fetchQuotations = useCallback(async (pageNum: number, currentSearchTerm: string) => {
        if (pageNum === 1) setLoading(true);
        else {
            setLoading(true);
        }
        try {
            const params: { search?: string; page: number } = { page: pageNum };
            if (currentSearchTerm) {
                params.search = currentSearchTerm;
            }
            const response = await axios.get<{ data: QuotationRow[]; current_page: number; last_page: number }>(`${API_BASE}/quotations`, { params });
            const newQuotations = response.data.data || [];
            setQuotations(prev => (pageNum === 1 ? newQuotations : [...prev, ...newQuotations]));
            setHasMore(response.data.current_page < response.data.last_page);
        } catch (error) {
            console.error("Failed to fetch quotations:", error);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, []);


    const lastQuotationElementRef = useCallback((node: HTMLTableRowElement | null) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    useEffect(() => {
        if (page > 1) fetchQuotations(page, searchTerm);
    }, [page, searchTerm, fetchQuotations]);

    useEffect(() => {
        fetchQuotations(1, searchTerm);
    }, [searchTerm, fetchQuotations]);

    const handleSearch = (newSearchTerm: string) => {
        setPage(1);
        setQuotations([]);
        setHasMore(true);
        setSearchTerm(newSearchTerm);
    };

    const handleRefresh = useCallback(() => {
        setPage(1);
        setQuotations([]);
        setHasMore(true);
        setSearchTerm('');
    }, []);



    const handleDelete = async (quot_no: string) => {
        if (window.confirm(`Are you sure you want to delete ${quot_no}?`)) {
            try {
                await axios.delete(`${API_BASE}/quotations/${encodeURIComponent(quot_no)}`);
                handleRefresh();
            } catch (error) {
                console.error(`Failed to delete ${quot_no}:`, error);
            }
        }
    };

    const toggleHistory = (quotNo: string) => setHistoryVisible(prev => ({ ...prev, [quotNo]: !prev[quotNo] }));
    const formatDate = (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
    const calculateDaysAgo = (dateStr: string | null) => {
        if (!dateStr) return '';
        const diffDays = Math.ceil((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 0) return '(Today)';
        if (diffDays === 1) return '(Yesterday)';
        return `(${diffDays} Days Ago)`;
    };

    return (
        <div className="quotation-list-container">
            <div className="quotation-header-wrapper">
                <h1>List of Quotation All</h1>
                <div className="header-right-section">
                    <Searchbar onSearch={handleSearch} />
                    <button onClick={() => navigate('/quotations/create')} className="create-new-btn">
                        <FontAwesomeIcon icon={faPlus} /> Create New Quotation
                    </button>
                </div>
            </div>

            <table className="quotation-table">
                <thead>
                    <tr>
                        <th>Quotation ID</th>
                        <th>Company Name/Contact</th>
                        <th>Lead Info</th>
                        <th>Status</th>
                        <th>Quotation History</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && quotations.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center' }}>Loading...</td></tr>
                    ) : quotations.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center' }}>No quotations found.</td></tr>
                    ) : (
                        quotations.map((quotation, index) => {
                            const isHistoryOpen = historyVisible[quotation.quot_no] ?? false;
                            const ref = (quotations.length === index + 1) ? lastQuotationElementRef : null;
                            return (
                                <tr ref={ref} key={`${quotation.id}-${index}`}>
                                    <td>
                                        <strong>{quotation.quot_id}</strong>
                                        {quotation.status === 'draft' && <span className="status-indicator draft">D</span>}
                                        {quotation.status === 'final' && <span className="status-indicator final">F</span>}
                                    </td>
                                    <td>
                                        <div><strong>{quotation.company_name}</strong> ({quotation.customer_id})</div>
                                        <div>{quotation.contact_person_name}</div>
                                        <div>{quotation.contact_no}</div>
                                    </td>
                                    <td>
                                        {/* New line added for quot_no */}
                                        <div>Quotation No: {quotation.quot_no}</div>
                                        <div>Id: {quotation.lead_id}</div>
                                    </td>
                                    <td>
                                        <div className="status-card">
                                            {/* First Line: FOLLOW UP */}
                                            <div className="follow-up-header">FOLLOW UP</div>

                                            {/* Second Line: HOT (Rs.0) */}
                                            <div className={`lead-priority ${quotation.lead_priority?.toLowerCase()}`}>
                                                {quotation.lead_priority} ({quotation.grand_total ? `Rs.${quotation.grand_total.toLocaleString('en-IN')}` : 'Rs.0'})
                                            </div>

                                            {/* Third Line: Check it... (activity) */}
                                            <div className="activity-info">
                                                {quotation.activity}
                                            </div>



                                            {/* Fourth Line: Next date from sts_lead_activity */}
                                            <div className="check-it-date">
                                                {quotation.created_date && quotation.created_date.trim() !== '' && (
                                                    <div>
                                                        <strong>Check It:</strong> {formatDate(quotation.created_date)}
                                                    </div>
                                                )}
                                            </div>


                                            {/* Fifth Line: Next Follow Date label */}
                                            <div className="next-follow-date-label">
                                                Next Follow Date :
                                            </div>

                                            {/* Sixth Line: Next Follow Date value */}
                                            <div className="next-follow-date-value">
                                                {formatDate(quotation.next_date)}
                                            </div>

                                            {/* Buttons */}
                                            <div className="action-buttons-card">
                                                <button className="update-btn">Update</button>
                                                <button className="history-btn-large" onClick={() => toggleHistory(quotation.quot_no)}>History</button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="quotation-history-cell">
                                        {/* LATEST QUOTATION BOX - Yeh hamesha dikhega */}
                                        <div className="latest-quotation-box">
                                            <div className="lq-header">LATEST QUOTATION</div>
                                            <div className="lq-header-row">
                                                <span>DATE</span>
                                                <span>ID</span>
                                                <span>TOTAL</span>
                                                <span>PRINT</span>
                                                <span>EDIT</span>
                                            </div>
                                            <div className="lq-row data">
                                                <div className="lq-col lq-date">
                                                    <span>{formatDate(quotation.date)}</span>
                                                    <span className="days-ago">{calculateDaysAgo(quotation.date)}</span>
                                                </div>
                                                <span>{quotation.quot_id}</span>
                                                <span>Rs. {quotation.grand_total?.toLocaleString('en-IN') ?? '0'}</span>
                                                <Link to={`/quotations/preview/${encodeURIComponent(quotation.quot_no)}`}><FontAwesomeIcon icon={faPrint} /></Link>
                                                <Link to={`/quotations/edit/${encodeURIComponent(quotation.quot_no)}`}><FontAwesomeIcon icon={faPencilAlt} /></Link>
                                            </div>
                                        </div>

                                        {/* HISTORY BUTTON & POPUP */}
                                        {quotation.quotation_history && quotation.quotation_history.length > 0 ? (
                                            <>
                                                <button className="history-trigger-btn" onClick={() => toggleHistory(quotation.quot_no)}>
                                                    Quotation History
                                                </button>
                                                {isHistoryOpen && (
                                                    <div className="history-popup">
                                                        <div className="history-popup-header">
                                                            QUOTATION HISTORY
                                                            <button onClick={() => toggleHistory(quotation.quot_no)} className="history-close-btn" title="Close"><FontAwesomeIcon icon={faTimes} /></button>
                                                        </div>
                                                        <div className="history-popup-body">
                                                            {/* Header Row */}
                                                            <div className="history-item header">
                                                                <span>DATE</span>
                                                                <span>ID</span>
                                                                <span>TOTAL</span>
                                                                <span>PRINT</span>
                                                                <span>EDIT</span>
                                                            </div>

                                                            {/* History Items */}
                                                            {/* Corrected: Use quotation.quotation_history instead of the undefined 'history' variable */}
                                                            {quotation.quotation_history.map((item) => (
                                                                <div className="history-item" key={item.id}>
                                                                    <div className="history-col history-date">
                                                                        <span>{formatDate(item.date)}</span>
                                                                        {/* Corrected: Remove the second argument from calculateDaysAgo */}
                                                                        <span className="days-ago">{calculateDaysAgo(item.date)}</span>
                                                                    </div>
                                                                    <div className="history-col">
                                                                        <span>{item.quot_id}</span>
                                                                        <button className="copy-btn">Copy</button>
                                                                    </div>
                                                                    <div className="history-col history-total">
                                                                        <span>Rs.</span>
                                                                        <span>{item.grand_total?.toLocaleString('en-IN') ?? '0'}</span>
                                                                    </div>
                                                                    <div className="history-col">
                                                                        <Link to={`/quotations/preview/${encodeURIComponent(item.quot_no)}`} className="action-icon" title="Print">
                                                                            <FontAwesomeIcon icon={faPrint} />
                                                                        </Link>
                                                                    </div>
                                                                    <div className="history-col">
                                                                        <Link to={`/quotations/edit/${encodeURIComponent(item.quot_no)}`} className="action-icon" title="Edit">
                                                                            <FontAwesomeIcon icon={faPencilAlt} />
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className='no-history'>No History</div>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        <Link to={`/quotations/preview/${encodeURIComponent(quotation.quot_no)}`} className="action-icon" title="Print">
                                            <FontAwesomeIcon icon={faEye} style={{ color: '#ff6666' }} />
                                        </Link>

                                        <Link to={`/quotations/edit/${encodeURIComponent(quotation.quot_no)}`} className="action-icon">
                                            <FontAwesomeIcon icon={faPencilAlt} style={{ color: '#ff6666' }} />
                                        </Link>
                                        <button className="action-icon" onClick={() => handleDelete(quotation.quot_no)}>
                                            <FontAwesomeIcon icon={faTrash} style={{ color: '#ff6666' }} />
                                        </button>
                                    </td>


                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
            {loading && quotations.length > 0 && (
                <div className="loading-spinner">
                    <div className="spinner" />
                </div>
            )}

            {/* Yeh block dikhega jab koi quotation na mile */}
            {!loading && quotations.length === 0 && <p style={{ textAlign: 'center', padding: '20px' }}>No quotations found.</p>}

            {/* Yeh block dikhega jab sab data load ho chuka ho */}
            {!hasMore && quotations.length > 0 && <p style={{ textAlign: 'center', padding: '20px', color: '#888' }}>-- You have reached the end --</p>}
        </div>
    );
};

export default QuotationsView;