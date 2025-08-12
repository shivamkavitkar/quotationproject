// src/sections/item/productItem.tsx

import './productItem.css';

import axios from 'axios';
import React, { useRef, useState, useEffect } from 'react';

// --- Constants ---
const API_BASE = '/api';
const ASSET_BASE_URL = import.meta.env.VITE_LARAVEL_ASSET_URL || 'http://localhost:8000';
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNmMmYzZjUiLz48L3N2Zz4=';

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
}

interface ProductSuggestion {
    product_id: number;
    name: string;
    price: number;
    hsn_code: string;
    picture?: string;
    category_name?: string;
    subcategory_name?: string;
    category_id?: number;
    subcategory_id?: number;
}

interface QuotationProductItemProps {
    item: ProductItemData;
    index: number;
    updateItem: (tempId: number, field: string, value: any) => void;
    removeItem: (tempId: number) => void;
}

interface Category {
    id: number;
    category_name: string;
}
interface Subcategory {
    id: number;
    subcategory_name: string;
}

// --- Component ---
const ProductItem: React.FC<QuotationProductItemProps> = ({ item, index, updateItem, removeItem }) => {
    // State for filtered search
    const [isAddingNewProduct, setIsAddingNewProduct] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [searchQuery, setSearchQuery] = useState(item.pro_dec || '');
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');

    // State for GLOBAL search
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');

    // Common state
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Refs
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const globalSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to set initial image
    useEffect(() => {
        const initialImageUrl = item.pro_image_url || (item.pro_image_path ? (item.pro_image_path.startsWith('http') ? item.pro_image_path : `${ASSET_BASE_URL}/storage/${item.pro_image_path}`) : null);
        setImagePreview(initialImageUrl);
    }, [item.pro_image_url, item.pro_image_path]);

    // Effect for clicking outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsSuggestionsVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Effect to fetch categories on component mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get<{ data: Category[] }>(`${API_BASE}/categories`);
                setCategories(response.data.data || []);
            } catch (error) {
                console.error("Failed to fetch categories:", error);
            }
        };
        fetchCategories();
    }, []);

    // Effect to calculate total price automatically
    useEffect(() => {
        const mrp = parseFloat(String(item.mrp)) || 0;
        const qty = parseInt(String(item.qty), 10) || 0;
        const discount = parseFloat(String(item.discount) || '0') || 0;
        const discountPer = parseFloat(String(item.discount_per) || '0') || 0;
        let calculatedTotal = mrp * qty;

        if (discountPer > 0) {
            calculatedTotal -= (calculatedTotal * discountPer / 100);
        } else if (discount > 0) {
            calculatedTotal -= discount;
        }

        const newTotal = parseFloat(Math.max(0, calculatedTotal).toFixed(2));

        if (newTotal !== item.total) {
            updateItem(item.tempId, 'total', newTotal);
        }
    }, [item.mrp, item.qty, item.discount, item.discount_per, item.total, item.tempId, updateItem]);


    // Handler for Category dropdown change
    const handleCategoryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const categoryId = e.target.value;
        setSelectedCategory(categoryId);
        setSelectedSubcategory('');
        setSubcategories([]);

        if (categoryId) {
            try {
                const response = await axios.get<{ data: Subcategory[] }>(`${API_BASE}/categories/${categoryId}/subcategories`);
                setSubcategories(response.data.data || []);
            } catch (error) {
                console.error("Failed to fetch subcategories:", error);
            }
        }
    };

    // Handler for Subcategory dropdown change
    const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSubcategory(e.target.value);
    };

    // Handler for the FILTERED text search input
    // This handler is for the filtered search input (the top one)
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        searchDebounceRef.current = setTimeout(async () => {
            // --- Special logic for "Add New Product" ---
            const selectedCategoryName = categories.find(c => c.id === Number(selectedCategory))?.category_name;

            if (selectedCategoryName === 'CUSTOMIZED' && query.toLowerCase().trim() === 'add') {
                const addProductSuggestion: ProductSuggestion = {
                    product_id: -1, // Special ID to identify this action
                    name: 'ADD NEW PRODUCT',
                    price: 0,
                    hsn_code: ''
                };
                setSuggestions([addProductSuggestion]);
                setIsSuggestionsVisible(true);
                return; // Stop here and don't call the API for a normal search
            }
            // --- End of special logic ---

            // Regular search logic
            if (query.length < 2 && !selectedCategory) {
                setSuggestions([]);
                return;
            }

            try {
                const params = new URLSearchParams();
                params.append('search', query);
                if (selectedCategory) params.append('category_id', selectedCategory);
                if (selectedSubcategory) params.append('subcategory_id', selectedSubcategory);

                const response = await axios.get<{ data: ProductSuggestion[] }>(`${API_BASE}/products?${params.toString()}`);
                const suggestionsData = Array.isArray(response.data.data) ? response.data.data : [];
                setSuggestions(suggestionsData);
                setIsSuggestionsVisible(true);
            } catch (error) {
                console.error("Error fetching suggestions:", error);
                setSuggestions([]);
            }
        }, 300);
    };

    // Handler for the GLOBAL text search input
    const handleGlobalSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setGlobalSearchQuery(query);
        if (globalSearchDebounceRef.current) clearTimeout(globalSearchDebounceRef.current);

        globalSearchDebounceRef.current = setTimeout(async () => {
            if (query.length < 2) {
                setSuggestions([]);
                return;
            }
            try {
                const params = new URLSearchParams();
                params.append('search', query);
                params.append('global_search', 'true');

                const response = await axios.get<{ data: ProductSuggestion[] }>(`${API_BASE}/products?${params.toString()}`);
                const suggestionsData = Array.isArray(response.data.data) ? response.data.data : [];
                setSuggestions(suggestionsData);
                setIsSuggestionsVisible(true);
            } catch (error) {
                console.error("Error fetching global suggestions:", error);
                setSuggestions([]);
            }
        }, 300);
    };

    // Handler for when a product suggestion is clicked
    // This function is triggered when a user clicks on a product in the suggestions dropdown.
    const handleSuggestionClick = (product: ProductSuggestion) => {
        // Set the text for the search bar and main description

        if (product.product_id === -1) {
            setIsAddingNewProduct(true); // Show the new product input form
            setIsSuggestionsVisible(false);
            setSearchQuery(''); // Clear the search bar
            return; // Stop the function here
        }

        setSearchQuery(product.name);
        // Hide the suggestions list
        setIsSuggestionsVisible(false);
        // Clear the global search bar
        // setGlobalSearchQuery('');

        // Update the main quotation item's data with the selected product's details
        updateItem(item.tempId, 'pro_id', String(product.product_id));
        updateItem(item.tempId, 'pro_dec', product.name);
        updateItem(item.tempId, 'mrp', product.price || 0);
        updateItem(item.tempId, 'hsn_code', product.hsn_code || '');

        // Update the product image
        if (product.picture) {
            const fullImageUrl = product.picture.startsWith('http')
                ? product.picture
                : `${ASSET_BASE_URL}/storage/${product.picture}`;
            setImagePreview(fullImageUrl);
            updateItem(item.tempId, 'pro_image_url', fullImageUrl);
            updateItem(item.tempId, 'pro_image_path', product.picture);
        } else {
            handleRemoveImage();
        }

        // --- NEW LOGIC TO UPDATE DROPDOWNS ---
        // Check if the product has a category_id
        if (product.category_id) {
            const categoryId = String(product.category_id);

            // 1. Set the Category dropdown to the product's category
            setSelectedCategory(categoryId);

            // 2. Fetch the list of subcategories for this new parent category
            axios.get<{ data: Subcategory[] }>(`${API_BASE}/categories/${categoryId}/subcategories`)
                .then(response => {
                    setSubcategories(response.data.data || []);

                    // 3. AFTER the subcategory list is loaded, set the Subcategory dropdown
                    if (product.subcategory_id) {
                        setSelectedSubcategory(String(product.subcategory_id));
                    }
                })
                .catch(error => {
                    console.error("Failed to auto-fetch subcategories:", error);
                    // Reset subcategories if the fetch fails
                    setSubcategories([]);
                    setSelectedSubcategory('');
                });
        } else {
            // If the product has no category, reset the dropdowns
            setSelectedCategory('');
            setSelectedSubcategory('');
            setSubcategories([]);
        }
    };

    // Generic handler for most other input changes in the row
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        updateItem(item.tempId, name, value);
    };

    // --- Image Handling Functions ---
    const triggerFileInput = () => fileInputRef.current?.click();

    const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await axios.post<{ url: string, path: string }>(`${API_BASE}/quotation-images`, formData);
            if (response.data?.url) {
                setImagePreview(response.data.url);
                updateItem(item.tempId, 'pro_image_url', response.data.url);
                updateItem(item.tempId, 'pro_image_path', response.data.path);
            }
        } catch (error) {
            console.error("Image upload failed:", error);
        }
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        updateItem(item.tempId, 'pro_image_url', null);
        updateItem(item.tempId, 'pro_image_path', null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // <<< ADD THIS ENTIRE NEW FUNCTION >>>
    const handleSaveNewProduct = async () => {
        if (!newProductName.trim()) {
            alert('Please enter a product name.');
            return;
        }
        if (!selectedCategory || !selectedSubcategory) {
            alert('Please select a category and subcategory first.');
            return;
        }

        // 1. Prepare the data payload for the new product
        const newProductData = {
            name: newProductName,
            category_id: Number(selectedCategory),
            subcategory_id: Number(selectedSubcategory),
            price: item.mrp,
            hsn_code: item.hsn_code,
            description: item.pro_dec,
            picture: item.pro_image_path,
        };

        try {
            // 2. Call the new API endpoint to save the product
            const response = await axios.post<{ data: ProductSuggestion }>(`${API_BASE}/products`, newProductData);
            const savedProduct = response.data.data;

            // 3. Update the current quotation line item with the new product's info
            if (savedProduct) {
                updateItem(item.tempId, 'pro_id', String(savedProduct.product_id));
                updateItem(item.tempId, 'pro_dec', savedProduct.name);
                setSearchQuery(savedProduct.name);
            }

            // 4. Reset the "add new product" state
            alert('New product saved successfully!');
            setIsAddingNewProduct(false);
            setNewProductName('');

        } catch (error) {
            console.error("Failed to save new product:", error);
            alert('Error: Could not save the new product.');
        }
    };

    return (
        <div className="quotation-product-item" ref={wrapperRef}>
            <div className="sno-col">{index + 1}</div>

            <div className="product-col">
                <div className="autocomplete-wrapper">

                    <div className="filter-dropdowns">
                        <select value={selectedCategory} onChange={handleCategoryChange}>
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                            ))}
                        </select>

                        <select value={selectedSubcategory} onChange={handleSubcategoryChange} disabled={!selectedCategory}>
                            <option value="">All Subcategories</option>
                            {subcategories.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.subcategory_name}</option>
                            ))}
                        </select>
                    </div>

                    <input
                        type="text"
                        placeholder="Search by Category..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => setIsSuggestionsVisible(true)}
                    />

                    {/* === HSN CODE KO YAHAN PASTE KAREIN, NAYI CLASSNAME KE SAATH === */}
                    <input
                        type="text"
                        placeholder="HSN Code"
                        name="hsn_code"
                        value={item.hsn_code || ''}
                        onChange={handleInputChange}
                        className="hsn-code-input" 
                    />

                    {isAddingNewProduct && (
                        <div className="new-product-form">
                            <input
                                type="text"
                                placeholder="Product Name..."
                                value={newProductName}
                                onChange={(e) => setNewProductName(e.target.value)}
                                className="new-product-input"
                            />

                        </div>
                    )}


                    <div className="global-search-wrapper">
                        <input
                            type="text"
                            placeholder="Search All Products..."
                            value={globalSearchQuery}
                            onChange={handleGlobalSearchChange}
                            onFocus={() => setIsSuggestionsVisible(true)}
                        />
                    </div>

                    {isSuggestionsVisible && suggestions.length > 0 && (
                        <ul className="suggestions-list">
                            {suggestions.map(p => {
                                const imageUrl = p.picture ? `${ASSET_BASE_URL}/storage/${p.picture}` : PLACEHOLDER_IMAGE;
                                return (
                                    <li key={p.product_id} onClick={() => handleSuggestionClick(p)}>
                                        <img
                                            src={imageUrl}
                                            alt={p.name}
                                            className="suggestion-image"
                                            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                                        />
                                        <div className="suggestion-details">
                                            <span className="suggestion-primary-text">{p.name}</span>
                                            <span className="suggestion-secondary-text">{p.category_name}</span>
                                            <span className="suggestion-tertiary-text">{p.subcategory_name}</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            <div className="image-col">
                <div className="image-wrapper">
                    {imagePreview ? <img src={imagePreview} alt="Product Preview" /> : <div className="placeholder-image">No Image</div>}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageFileSelect} style={{ display: 'none' }} accept="image/*" />
                <button type="button" onClick={triggerFileInput} className="choose-file-btn">Choose File</button>
                {imagePreview && <button type="button" onClick={handleRemoveImage} className="remove-image-btn">🗑️</button>}
                {isAddingNewProduct && (
                    <button type="button" onClick={handleSaveNewProduct} className="save-product-btn">
                        Save Product
                    </button>
                )}

            </div>

            <div className="description-col">
                <input type="text" placeholder="Description Heading" name="description_head" value={item.description_head || ''} onChange={handleInputChange} />
                <textarea
                    placeholder="Description"
                    name="pro_dec"
                    value={item.pro_dec || ''} // <-- Ise searchQuery se badal kar item.pro_dec karein
                    onChange={handleInputChange}     // <-- Sirf handleInputChange ko call karein
                />
            </div>

            <div className="specification-col">
                <input type="text" placeholder="Size" name="size" value={item.size || ''} onChange={handleInputChange} />
                <input type="text" placeholder="Color" name="colour" value={item.colour || ''} onChange={handleInputChange} />
            </div>

            <div className="price-col">
                <input type="number" step="0.01" name="mrp" value={item.mrp} onChange={handleInputChange} />
            </div>

            <div className="qty-col">
                <input type="number" name="qty" min="1" value={item.qty} onChange={handleInputChange} />
            </div>

            <div className="discount-col">
                <input type="number" step="0.01" placeholder="Discount" name="discount" value={item.discount || ''} onChange={handleInputChange} />
            </div>

            <div className="discount-percent-col">
                <input type="number" step="0.01" placeholder="Discount %" name="discount_per" value={item.discount_per || ''} onChange={handleInputChange} />
            </div>

            <div className="total-col">
                <input type="text" value={item.total.toFixed(2)} readOnly />
            </div>

            <div className="remove-col">
                <button type="button" onClick={() => removeItem(item.tempId)} className="remove-item-btn">🗑️</button>
            </div>
        </div>
    );
};

export default ProductItem;