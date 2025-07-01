import { X, ShoppingCart, Hash, Clock, Tag, DollarSign, Calendar, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { baseUrl } from '../../../utils/constants';

interface OrderDetailsModalProps {
    orderId: string;
    onClose: () => void;
}

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

interface OrderDetails {
    id: string;
    items: OrderItem[];
    status: string;
    deliveredAt: string | null;
    readyAt: string | null;
    total: number;
    createdAt: string;
    locationName: string;
}

const OrderDetailsModal = ({ orderId, onClose }: OrderDetailsModalProps) => {
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${baseUrl}/admin/customers/orders/${orderId}`, {
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrder(data.data);
                } else {
                    console.error('Failed to fetch order details');
                }
            } catch (error) {
                console.error('Error fetching order details:', error);
            } finally {
                setLoading(false);
            }
        };

        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);
    
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'Invalid Date';
        return d.toLocaleString();
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Order Details
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading order details...</span>
                        </div>
                    ) : !order ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Order not found</h3>
                            <p className="text-gray-600">Could not load details for this order.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-gray-500" /><span>Order ID:</span><span className="font-medium text-gray-800">{order.id}</span></div>
                                <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-gray-500" /><span>Status:</span><span className="font-medium text-gray-800 px-2 py-0.5 rounded-full bg-blue-100">{order.status}</span></div>
                                <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-gray-500" /><span>Total:</span><span className="font-medium text-gray-800">{order.total}</span></div>
                                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-500" /><span>Location:</span><span className="font-medium text-gray-800">{order.locationName}</span></div>
                                <div className="flex items-center gap-2 col-span-1 md:col-span-2"><Calendar className="h-4 w-4 text-gray-500" /><span>Created At:</span><span className="font-medium text-gray-800">{formatDate(order.createdAt)}</span></div>
                                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><span>Ready At:</span><span className="font-medium text-gray-800">{formatDate(order.readyAt)}</span></div>
                                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><span>Delivered At:</span><span className="font-medium text-gray-800">{formatDate(order.deliveredAt)}</span></div>
                            </div>
                            
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">Items</h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3">Product</th>
                                                <th scope="col" className="px-6 py-3">Quantity</th>
                                                <th scope="col" className="px-6 py-3">Price</th>
                                                <th scope="col" className="px-6 py-3">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.map((item, index) => (
                                                <tr key={item.id || index} className="bg-white border-b">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                                    <td className="px-6 py-4">{item.quantity}</td>
                                                    <td className="px-6 py-4">{item.price.toFixed(2)}</td>
                                                    <td className="px-6 py-4">{(item.quantity * item.price).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsModal; 