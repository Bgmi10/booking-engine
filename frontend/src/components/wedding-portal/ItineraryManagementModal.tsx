import React, { useState, useEffect } from 'react';
import { RiAddLine, RiCloseLine, RiEditLine } from 'react-icons/ri';
import { baseUrl } from '../../utils/constants';
import toast from 'react-hot-toast';

interface ItineraryManagementModalProps {
    proposal: any;
    onClose: () => void;
    onUpdate: (updatedProposal: any) => void;
}

export const ItineraryManagementModal: React.FC<ItineraryManagementModalProps> = ({
    proposal,
    onClose,
    onUpdate
}) => {
    const [itineraryDays, setItineraryDays] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<{ dayIndex: number, itemIndex: number | null, item: any } | null>(null);
    
    // Initialize itinerary days from proposal
    useEffect(() => {
        if (proposal && proposal.itineraryDays) {
            setItineraryDays(JSON.parse(JSON.stringify(proposal.itineraryDays))); // Deep clone
        }
    }, [proposal]);

    // Fetch available products once on mount
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await fetch(`${baseUrl}/customers/products/all`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    setAvailableProducts(data.data);
                }
            } else {
                console.error('Failed to fetch products:', response.status, response.statusText);
                toast.error('Failed to load available products');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load available products');
        }
    };

    const handleDayDateChange = (dayIndex: number, newDate: string) => {
        const updatedDays = [...itineraryDays];
        updatedDays[dayIndex].date = newDate;
        setItineraryDays(updatedDays);
    };

    const handleAddItem = (dayIndex: number) => {
        setEditingItem({ dayIndex, itemIndex: null, item: null });
        setIsEditModalOpen(true);
    };

    const handleEditItem = (dayIndex: number, itemIndex: number) => {
        const item = itineraryDays[dayIndex].items[itemIndex];
        setEditingItem({ dayIndex, itemIndex, item });
        setIsEditModalOpen(true);
    };

    const handleSaveItem = (itemData: any) => {
        if (!editingItem) return;
        
        const { dayIndex, itemIndex } = editingItem;
        const updatedDays = [...itineraryDays];
        
        // Find the selected product to get its pricing information
        const selectedProduct = availableProducts.find(p => p.id === itemData.productId);
        
        if (!selectedProduct) {
            toast.error('Selected product not found');
            return;
        }

        // Calculate price based on product pricing model
        const calculatedPrice = selectedProduct.pricingModel === 'PER_PERSON' 
            ? selectedProduct.price * itemData.guestCount
            : selectedProduct.price;

        const itemToSave = {
            ...itemData,
            price: calculatedPrice,
            product: selectedProduct
        };
        
        if (itemIndex === null) {
            // Adding new item
            updatedDays[dayIndex].items.push(itemToSave);
        } else {
            // Updating existing item
            updatedDays[dayIndex].items[itemIndex] = {
                ...updatedDays[dayIndex].items[itemIndex],
                ...itemToSave
            };
        }
        
        setItineraryDays(updatedDays);
        setIsEditModalOpen(false);
        setEditingItem(null);
    };

    const handleCancelEdit = () => {
        setIsEditModalOpen(false);
        setEditingItem(null);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        
        try {
            console.log('Submitting itinerary update:', { proposalId: proposal.id, itineraryDays });
            const response = await fetch(`${baseUrl}/customers/proposals/${proposal.id}/itinerary`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ itineraryDays })
            });

            const data = await response.json();
            console.log('API response:', { status: response.status, data });

            if (response.ok) {
                toast.success('Itinerary updated successfully');
                // Update the proposal with the new data
                onUpdate(data.data);
                onClose();
            } else {
                throw new Error(data.message || 'Failed to update itinerary');
            }
        } catch (error: any) {
            console.error('Error updating itinerary:', error);
            toast.error(error.message || 'An error occurred while updating itinerary');
        } finally {
            setIsLoading(false);
        }
    };

    const EditItemModal = () => {
        if (!editingItem) return null;
        
        const { dayIndex, itemIndex, item } = editingItem;
        const day = itineraryDays[dayIndex];
        
        const [formData, setFormData] = useState({
            productId: item?.productId || '',
            guestCount: item?.guestCount || 2,
            status: item?.status || 'OPTIONAL',
            notes: item?.notes || ''
        });

        const [selectedProduct, setSelectedProduct] = useState<any>(item?.product || null);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const { name, value } = e.target;
            
            if (name === 'productId') {
                const product = availableProducts.find(p => p.id === value);
                setSelectedProduct(product || null);
            }
            
            setFormData(prev => ({
                ...prev,
                [name]: name === 'guestCount' ? Number(value) : value
            }));
        };

        const handleFormSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            handleSaveItem(formData);
        };

        // Calculate price based on selected product and guest count
        const calculatedPrice = selectedProduct 
            ? (selectedProduct.pricingModel === 'PER_PERSON' 
                ? selectedProduct.price * formData.guestCount
                : selectedProduct.price)
            : 0;

        return (
            <div 
                className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
                style={{ backdropFilter: 'blur(8px)' }}
                onClick={handleCancelEdit}
            >
                <div 
                    className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] relative animate-fade-in flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-gray-200/80 flex justify-between items-center flex-shrink-0">
                        <h3 className="text-lg font-semibold">
                            {itemIndex === null ? 'Add New Item' : 'Edit Item'}
                        </h3>
                        <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-700">
                            <RiCloseLine size={24} />
                        </button>
                    </div>

                    <div className="flex-grow p-6 overflow-y-auto">
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700">
                                <strong>Day {day.dayNumber}</strong> - {new Date(day.date).toLocaleDateString()}
                            </p>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                                <select
                                    name="productId"
                                    value={formData.productId}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select a product</option>
                                    {availableProducts.length > 0 ? (
                                        availableProducts.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} - €{product.price.toFixed(2)} {product.pricingModel === 'PER_PERSON' ? '(per person)' : '(fixed)'}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>Loading products...</option>
                                    )}
                                </select>
                                {availableProducts.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">No products available. Please contact support.</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Count *</label>
                                <input
                                    type="number"
                                    name="guestCount"
                                    value={formData.guestCount}
                                    onChange={handleChange}
                                    min="1"
                                    max="120"
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="OPTIONAL">Optional</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Calculated Price (€)</label>
                                <input
                                    type="number"
                                    value={calculatedPrice.toFixed(2)}
                                    disabled
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Price is automatically calculated based on the selected product and guest count
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    placeholder="Any additional notes or special requests..."
                                />
                            </div>
                        </form>
                    </div>

                    <div className="p-4 border-t border-gray-200/80 flex justify-end space-x-3 flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleFormSubmit}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            {itemIndex === null ? 'Add Item' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div 
                className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                style={{ backdropFilter: 'blur(8px)' }}
                onClick={onClose}
            >
                <div 
                    className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[85vh] relative animate-fade-in flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-gray-200/80 flex justify-between items-center">
                        <h2 className="text-xl font-bold">Manage Itinerary</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <RiCloseLine size={24} />
                        </button>
                    </div>

                    <div className="flex-grow p-6 overflow-y-auto">
                        {itineraryDays.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                No itinerary days available.
                            </div>
                        ) : (
                            itineraryDays.map((day, dayIndex) => (
                                <div key={day.id} className="mb-6 border rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium">Day {day.dayNumber}</h3>
                                        <div className="flex items-center">
                                            <label className="mr-2 text-sm font-medium text-gray-700">Date:</label>
                                            <input
                                                type="date"
                                                value={day.date.split('T')[0]}
                                                onChange={(e) => handleDayDateChange(dayIndex, e.target.value)}
                                                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Items list */}
                                    <div className="space-y-3 mb-4">
                                        {day.items && day.items.length > 0 ? (
                                            day.items.map((item: any, itemIndex: number) => (
                                                <div 
                                                    key={item.id || `new-${itemIndex}`}
                                                    className="border border-gray-200 rounded-lg p-4 flex justify-between items-start hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center mb-2">
                                                            <span className="font-medium text-gray-900">{item.product?.name || 'Unknown Product'}</span>
                                                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                                                item.status === 'CONFIRMED' 
                                                                    ? 'bg-green-100 text-green-800' 
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {item.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-600 space-y-1">
                                                            <div>👥 Guests: {item.guestCount}</div>
                                                            <div>💰 Price: €{item.price?.toFixed(2) || '0.00'}</div>
                                                            {item.notes && <div>📝 Notes: {item.notes}</div>}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleEditItem(dayIndex, itemIndex)}
                                                        className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    >
                                                        <RiEditLine size={18} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                                                <p className="text-gray-500">No items planned for this day</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Add item button */}
                                    <button
                                        onClick={() => handleAddItem(dayIndex)}
                                        className="w-full flex items-center justify-center text-blue-600 hover:text-blue-800 py-3 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                                    >
                                        <RiAddLine size={18} className="mr-2" />
                                        <span>Add Item to Day {day.dayNumber}</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="bg-gray-50/80 px-4 py-3 flex justify-end space-x-3 border-t border-gray-200/80">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isLoading ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Item Modal */}
            {isEditModalOpen && <EditItemModal />}
        </>
    );
}; 