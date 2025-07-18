import React, { useState, useEffect } from 'react';
import { baseUrl } from '../../../utils/constants';
import type { ItineraryDay, Product } from '../../../types/types';
import toast from 'react-hot-toast';
import { RiAddLine, RiDeleteBinLine, RiInformationLine } from 'react-icons/ri';

type ItineraryItemsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dayId: string, items: any[]) => void;
  day: ItineraryDay | null;
  proposalId: string;
  loading: boolean;
};

const ItineraryItemsModal: React.FC<ItineraryItemsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  day,
  loading,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    productId: '',
    guestCount: 2,
    status: 'OPTIONAL' as 'CONFIRMED' | 'OPTIONAL',
    notes: '',
  });

  // Fetch products when modal opens
  useEffect(() => {
    if (isOpen && day) {
      fetchProducts();
      setItems(day.items || []);
    }
  }, [isOpen, day]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/products/all?type=WEDDING`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok) {
        setProducts(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch products');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch products');
    }
  };

  const handleAddItem = () => {
    if (!newItem.productId) {
      toast.error('Please select a product');
      return;
    }

    const selectedProduct = products.find(p => p.id === newItem.productId);
    if (!selectedProduct) {
      toast.error('Selected product not found');
      return;
    }

    const price = selectedProduct.pricingModel === 'PER_PERSON' 
      ? selectedProduct.price * newItem.guestCount
      : selectedProduct.price;

    // Add new item with product details
    const itemToAdd = {
      ...newItem,
      price,
      product: selectedProduct,
    };

    setItems([...items, itemToAdd]);
    
    // Reset form
    setNewItem({
      productId: '',
      guestCount: 2,
      status: 'OPTIONAL',
      notes: '',
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (day) {
      onSave(day.id, items);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setNewItem(prev => ({
        ...prev,
        [name]: Math.min(Math.max(numValue, 1), 120), // Clamp between 1 and 120
      }));
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'CONFIRMED'
      ? 'bg-green-100 text-green-800'
      : 'bg-amber-100 text-amber-800';
  };

  if (!isOpen) return null;

  return (
    <div className="p-4 flex-1 overflow-auto">
      {/* Notification Banner */}
      <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md flex items-start">
        <RiInformationLine className="text-blue-500 text-xl flex-shrink-0 mt-0.5 mr-3" />
        <div>
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> When you save changes to the itinerary, the customer will be automatically notified via email about these changes.
          </p>
        </div>
      </div>

      {/* Current Items */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Current Items</h3>
        {items.length > 0 ? (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {items.map((item, index) => (
              <li key={index} className="p-3 flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{item.product.name}</span>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusColor(item.status)}`}>
                      {item.status === 'CONFIRMED' ? 'Confirmed' : 'Optional'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Guests: {item.guestCount} • Price: €{item.price.toFixed(2)}
                  </div>
                  {item.notes && <div className="text-sm italic mt-1">{item.notes}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <RiDeleteBinLine size={20} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-500 py-4 border border-gray-200 rounded-lg">
            No items added yet. Add products or services below.
          </p>
        )}
      </div>

      {/* Add New Item Form */}
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Add Item</h3>
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="mb-4">
            <label htmlFor="productId" className="block text-sm font-medium text-gray-700">
              Product/Service
            </label>
            <select
              id="productId"
              name="productId"
              value={newItem.productId}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - €{product.price.toFixed(2)} {product.pricingModel === 'PER_PERSON' ? '(per person)' : '(fixed)'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="guestCount" className="block text-sm font-medium text-gray-700">
                Guest Count
              </label>
              <input
                type="number"
                id="guestCount"
                name="guestCount"
                value={newItem.guestCount}
                onChange={handleNumberChange}
                min="1"
                max="120"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={newItem.status}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="OPTIONAL">Optional</option>
                <option value="CONFIRMED">Confirmed</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={newItem.notes}
              onChange={handleInputChange}
              rows={2}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center"
          >
            <RiAddLine className="mr-1" /> Add Item
          </button>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default ItineraryItemsModal; 