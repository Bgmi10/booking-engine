import { X, Package, ListOrdered, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { baseUrl } from '../../../utils/constants';

interface TempCustomer {
    id: string;
    surname: string;
    guestEmail?: string;
}

interface OrderItem {
    id: string;
    quantity: number;
    name: string;
    price: number;
}

interface Order {
    id: string;
    total: number;
    status: string;
    createdAt: string;
    items: OrderItem[];
}

interface TempCustomerOrdersModalProps {
    customer: TempCustomer;
    onClose: () => void;
}

export default function TempCustomerOrdersModal({ customer, onClose }: TempCustomerOrdersModalProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [openOrderId, setOpenOrderId] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${baseUrl}/admin/temp-customers/${customer.id}/orders`, {
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrders(data.data.orders || []);
                } else {
                    console.error("Failed to fetch orders");
                    setOrders([]);
                }
            } catch (error) {
                console.error("Error fetching orders:", error);
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [customer.id]);

    const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DELIVERED':
                return 'bg-green-100 text-green-800';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <ListOrdered className="h-6 w-6 text-blue-600" />
                            Orders for {customer.surname}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                            <p className="ml-4 text-gray-600">Loading orders...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-20">
                            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-xl font-medium text-gray-900">No Orders Found</h3>
                            <p className="text-gray-600 mt-2">This guest has not placed any orders yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map(order => (
                                <div key={order.id} className="bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setOpenOrderId(openOrderId === order.id ? null : order.id)}>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0">
                                                <div className={`p-2 rounded-full ${getStatusColor(order.status)}`}>
                                                    <Package className="h-5 w-5" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">Order #{order.id.slice(-6)}</p>
                                                <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                             <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                            <span className="font-bold text-lg text-gray-800">${order.total.toFixed(2)}</span>
                                            {openOrderId === order.id ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                                        </div>
                                    </div>
                                    {openOrderId === order.id && (
                                        <div className="border-t border-gray-200 p-4">
                                            <h4 className="font-semibold mb-2 text-gray-800">Order Details:</h4>
                                            <ul className="space-y-2">
                                                {order.items.map((item: OrderItem) => (
                                                    <li key={item.id} className="flex justify-between items-center bg-white p-2 rounded-md">
                                                        <div>
                                                            <span className="font-medium text-gray-900">{item.name}</span>
                                                            <span className="text-sm text-gray-600"> (x{item.quantity})</span>
                                                        </div>
                                                        <span className="text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 