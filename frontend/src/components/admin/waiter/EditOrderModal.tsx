import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import ProductSelectionStep from '../orders/ProductSelectionStep'; 
import { baseUrl } from '../../../utils/constants';
import type { WaiterOrder } from '../../../types/types';

interface EditOrderModalProps {
  order: WaiterOrder;
  onClose: () => void;
  onOrderUpdated: (updatedItems: any[]) => void;
}

export default function EditOrderModal({ order, onClose, onOrderUpdated }: EditOrderModalProps) {
  const [cart, setCart] = useState(() => {
    if (!order.items || !Array.isArray(order.items)) {
      return [];
    }
    return order.items.map(item => ({
      ...item,
      quantity: item.quantity || 1,
    }));
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${baseUrl}/admin/orders/${order.id}/edit`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: cart }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order');
      }
      toast.success('Order updated successfully!');
      onOrderUpdated(cart);
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const originalTotal = useMemo(() => {
    return order.items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  }, [order.items]);

  const newTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  }, [cart]);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800 text-center">Edit Order #{order.orderId.slice(-6)}</h2>
        </div>
        
        <div className="flex-grow overflow-hidden">
          <ProductSelectionStep cart={cart} setCart={setCart} />
        </div>
        
        <div className="p-4 bg-white border-t flex flex-col md:flex-row md:justify-between items-center gap-4">
          <div className='flex items-baseline gap-4'>
            <div>
                <p className='text-sm text-gray-500'>Original</p>
                <p className="text-xl font-bold text-gray-500 line-through">€{originalTotal.toFixed(2)}</p>
            </div>
            <div>
                <p className='text-sm text-blue-600'>New Total</p>
                <p className="text-3xl font-bold text-blue-600">€{newTotal.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-semibold"
              disabled={isSaving || newTotal === originalTotal}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 