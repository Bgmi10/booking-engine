import React, { useState, useEffect } from 'react';
import { RiAddLine, RiCloseLine, RiDeleteBinLine, RiEditLine } from 'react-icons/ri';
import { baseUrl } from '../../utils/constants';
import toast from 'react-hot-toast';

interface ItineraryManagementModalProps {
    proposalId: string;
    existingItinerary?: any[];
    onClose: () => void;
    onUpdate: (updatedItinerary: any[]) => void;
}

export const ItineraryManagementModal: React.FC<ItineraryManagementModalProps> = ({
    proposalId,
    existingItinerary = [],
    onClose,
    onUpdate
}) => {
    const [itineraryDays, setItineraryDays] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [editingItemIndex, setEditingItemIndex] = useState<{ dayIndex: number, itemIndex: number | null }>({ dayIndex: -1, itemIndex: null });

    // Load existing itinerary on mount
    useEffect(() => {
        if (existingItinerary && existingItinerary.length > 0) {
            setItineraryDays(JSON.parse(JSON.stringify(existingItinerary))); // Deep clone
        }
        
        // Fetch available products
        fetchProducts();
    }, [existingItinerary]);

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
        setEditingItemIndex({ dayIndex, itemIndex: null });
    };

    const handleEditItem = (dayIndex: number, itemIndex: number) => {
        setEditingItemIndex({ dayIndex, itemIndex });
    };

    const handleDeleteItem = (dayIndex: number, itemIndex: number) => {
        const updatedDays = [...itineraryDays];
        updatedDays[dayIndex].items.splice(itemIndex, 1);
        setItineraryDays(updatedDays);
    };

    const handleSaveItem = (dayIndex: number, itemIndex: number | null, itemData: any) => {
        const updatedDays = [...itineraryDays];
        
        if (itemIndex === null) {
            // Adding new item
            updatedDays[dayIndex].items.push(itemData);
        } else {
            // Updating existing item
            updatedDays[dayIndex].items[itemIndex] = {
                ...updatedDays[dayIndex].items[itemIndex],
                ...itemData
            };
        }
        
        setItineraryDays(updatedDays);
        setEditingItemIndex({ dayIndex: -1, itemIndex: null });
    };

    const handleCancelEdit = () => {
        setEditingItemIndex({ dayIndex: -1, itemIndex: null });
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        
        try {
            const response = await fetch(`${baseUrl}/customers/proposals/${proposalId}/itinerary`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ itineraryDays })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Itinerary updated successfully');
                onUpdate(itineraryDays);
                onClose();
            } else {
                throw new Error(data.message || 'Failed to update itinerary');
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred while updating itinerary');
        } finally {
            setIsLoading(false);
        }
    };

    const ItemForm = ({ dayIndex, itemIndex, onSave, onCancel }: any) => {
        const day = itineraryDays[dayIndex];
        const item = itemIndex !== null ? day.items[itemIndex] : null;
        
        const [formData, setFormData] = useState({
            productId: item?.productId || '',
            guestCount: item?.guestCount || 0,
            status: item?.status || 'OPTIONAL',
            price: item?.price || 0,
            notes: item?.notes || ''
        });

        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const { name, value } = e.target;
            setFormData(prev => ({
                ...prev,
                [name]: name === 'guestCount' || name === 'price' ? Number(value) : value
            }));
        };

        const handleFormSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            onSave(dayIndex, itemIndex, formData);
        };

        return (
            <div className="bg-gray-100 p-4 rounded-md mb-4">
                <h4 className="text-lg font-medium mb-3">{itemIndex === null ? 'Add New Item' : 'Edit Item'}</h4>
                <form onSubmit={handleFormSubmit}>
                    <div className="grid grid-cols-1 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                            <select
                                name="productId"
                                value={formData.productId}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="">Select a product</option>
                                {availableProducts.map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Guest Count</label>
                            <input
                                type="number"
                                name="guestCount"
                                value={formData.guestCount}
                                onChange={handleChange}
                                min="1"
                                max="120"
                                required
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="OPTIONAL">Optional</option>
                                <option value="CONFIRMED">Confirmed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (€)</label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                required
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center border-b p-4">
                    <h2 className="text-xl font-bold">Manage Itinerary</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <RiCloseLine size={24} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
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
                                    {day.items.map((item: any, itemIndex: number) => (
                                        <div 
                                            key={item.id || `new-${itemIndex}`}
                                            className="border border-gray-200 rounded-md p-3 flex justify-between items-start"
                                        >
                                            <div>
                                                <div className="flex items-center">
                                                    <span className="font-medium">{item.product?.name || 'Unknown Product'}</span>
                                                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                                        item.status === 'CONFIRMED' 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-500 mt-1">
                                                    <div>Guests: {item.guestCount}</div>
                                                    <div>Price: €{item.price}</div>
                                                    {item.notes && <div>Notes: {item.notes}</div>}
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button 
                                                    onClick={() => handleEditItem(dayIndex, itemIndex)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <RiEditLine size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteItem(dayIndex, itemIndex)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <RiDeleteBinLine size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Add item button */}
                                <button
                                    onClick={() => handleAddItem(dayIndex)}
                                    className="flex items-center text-blue-600 hover:text-blue-800"
                                >
                                    <RiAddLine size={18} className="mr-1" />
                                    <span>Add Item</span>
                                </button>

                                {/* Item form when editing */}
                                {editingItemIndex.dayIndex === dayIndex && (
                                    <ItemForm
                                        dayIndex={dayIndex}
                                        itemIndex={editingItemIndex.itemIndex}
                                        onSave={handleSaveItem}
                                        onCancel={handleCancelEdit}
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 ${
                            isLoading ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}; 