import { useState, useEffect } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import type { BookingGroup, PaymentIntentData } from '../../../types/types';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  tax: number;
}

interface PaymentIntentOrder {
  id: string;
  name: string;
  price: number;
  quantity: number;
  tax?: number;
}

interface TaxOptimizationModalProps {
  paymentIntent?: PaymentIntentData;
  group?: BookingGroup; // BookingGroup type
  isGroupMode?: boolean;
  onClose: () => void;
}

export default function TaxOptimizationModal({ paymentIntent, group, isGroupMode = false, onClose }: TaxOptimizationModalProps) {
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Extract order items from group
  const getOrderItemsFromGroup = (): PaymentIntentOrder[] => {
    const items: PaymentIntentOrder[] = [];
    
    if (!group) return items;
    
    // Extract from group charges
    if (group.charges && Array.isArray(group.charges)) {
      group.charges.forEach((charge: any) => {
        items.push({
          id: `charge-${charge.id}`,
          name: charge.description || 'Direct Charge',
          price: charge.amount || 0,
          quantity: 1,
          tax: 10 // Default tax percentage
        });
      });
    }
    
    // Extract from group orders
    if (group.orders && Array.isArray(group.orders)) {
      group.orders.forEach((order: any) => {
        if (order.items) {
          try {
            const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            if (Array.isArray(orderItems)) {
              orderItems.forEach((item: any) => {
                items.push({
                  id: item.id || `order-${order.id}-${item.name}`,
                  name: item.name,
                  price: item.price || 0,
                  quantity: item.quantity || 1,
                  tax: item.tax || 10
                });
              });
            }
          } catch (e) {
            console.error('Error parsing group order items:', e);
          }
        }
      });
    }
    
    // Extract booking items from payment intents for room details
    if (group.paymentIntents && Array.isArray(group.paymentIntents)) {
      group.paymentIntents.forEach((pi: any) => {
        if (pi.bookingData) {
          try {
            const bookingData = Array.isArray(pi.bookingData) ? pi.bookingData : JSON.parse(pi.bookingData);
            bookingData.forEach((booking: any) => {
              let nights = 1;
              if (booking.checkIn && booking.checkOut) {
                const checkIn = new Date(booking.checkIn);
                const checkOut = new Date(booking.checkOut);
                nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
              }
              
              items.push({
                id: `booking-${booking.selectedRoom}-${pi.id}`,
                name: `${booking.roomDetails?.name || 'Room'} - ${nights} nights (${pi.customerData?.firstName || 'Guest'})`,
                price: booking.totalPrice || booking.price || 0,
                quantity: 1,
                tax: booking.taxPercentage || 10
              });
            });
          } catch (e) {
            console.error('Error parsing booking data from group:', e);
          }
        }
      });
    }
    
    return items;
  };

  // Extract order items from payment intent
  const getOrderItemsFromPaymentIntent = (): PaymentIntentOrder[] => {
    const items: PaymentIntentOrder[] = [];
    
    // Extract from booking data
    if (!isGroupMode && paymentIntent?.bookingData) {
      try {
        const bookingData = paymentIntent.bookingData;
        bookingData.forEach((booking: any) => {
          // Calculate nights if not provided
          let nights = 1;
          if (booking.checkIn && booking.checkOut) {
            const checkIn = new Date(booking.checkIn);
            const checkOut = new Date(booking.checkOut);
            nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          }
          
          items.push({
            id: `booking-${booking.selectedRoom}`,
            name: `${booking.roomDetails?.name || 'Room'} - ${nights} nights`,
            price: booking.totalPrice || booking.price,
            quantity: 1,
            tax: booking.taxPercentage || 10
          });
        });
      } catch (e) {
        console.error('Error parsing booking data:', e);
      }
    }
    
    // Extract from orders
    if ( !isGroupMode && paymentIntent?.orders && Array.isArray(paymentIntent?.orders)) {
      paymentIntent?.orders.forEach((order: any) => {
        if (order.items) {
          // Parse the JSON items field
          try {
            const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            if (Array.isArray(orderItems)) {
              orderItems.forEach((item: any) => {
                items.push({
                  id: item.id || `order-${order.id}-${item.name}`,
                  name: item.name,
                  price: item.price || 0,
                  quantity: item.quantity || 1,
                  tax: item.tax || 10
                });
              });
            }
          } catch (e) {
            console.error('Error parsing order items:', e);
          }
        }
      });
    }
    
    return items;
  };

  // Fetch all order items
  useEffect(() => {
    const fetchOrderItems = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${baseUrl}/admin/order-items/all`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch order items');
        }
        
        const data = await response.json();
        
        // Filter out items already in the order
        const existingItems = isGroupMode ? getOrderItemsFromGroup() : getOrderItemsFromPaymentIntent();
        const existingItemIds = existingItems.map(item => item.id);
        const filtered = data.data.filter((item: OrderItem) => 
          !existingItemIds.includes(item.id) && 
          !existingItemIds.includes(`booking-${item.id}`)
        );
        
        setOrderItems(filtered);
      } catch (err) {
        console.error('Error fetching order items:', err);
        setError('Failed to load replacement items');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrderItems();
  }, [paymentIntent, group, isGroupMode]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const endpoint = isGroupMode 
        ? `${baseUrl}/admin/booking-groups/${group?.id}/invoice/tax-optimized`
        : `${baseUrl}/admin/payment-intent/${paymentIntent?.id}/invoice/tax-optimized`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ replacements })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate invoice');
      }
      
      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isGroupMode 
        ? `tax-invoice-group-${group?.id}.pdf`
        : `tax-invoice-${paymentIntent?.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      onClose();
    } catch (err) {
      console.error('Error generating tax invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentItems = isGroupMode ? getOrderItemsFromGroup() : getOrderItemsFromPaymentIntent();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Generate Tax-Optimized Invoice {isGroupMode ? '(Group)' : '(Individual)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <p className="text-gray-600 mb-6">
            Select replacement items to optimize tax calculation. Original prices will be maintained with updated tax rates.
          </p>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Item
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tax
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Replace With
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Tax
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">€{item.price.toFixed(2)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.tax}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={replacements[item.id] || ''}
                          onChange={(e) => setReplacements({
                            ...replacements,
                            [item.id]: e.target.value
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        >
                          <option value="">No replacement</option>
                          {orderItems.map(replacement => (
                            <option key={replacement.id} value={replacement.id}>
                              {replacement.name} (€{replacement.price.toFixed(2)}, Tax: {replacement.tax}%)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {replacements[item.id] && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {orderItems.find(r => r.id === replacements[item.id])?.tax || 0}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-500">
            {Object.keys(replacements).filter(key => replacements[key]).length} items will be replaced
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Tax Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}