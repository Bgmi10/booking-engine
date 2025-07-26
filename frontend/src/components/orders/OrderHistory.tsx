import { Clock, Package, Check, MapPin } from "lucide-react";
import { useCustomer } from "../../context/CustomerContext";

interface OrderHistoryProps {
    onClose: () => void;
}

export default function OrderHistory({ onClose }: OrderHistoryProps) {
    const { customer } = useCustomer();

    if (!customer || !customer.orders) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600">No orders found.</p>
                <button 
                    onClick={onClose}
                    className="mt-4 px-6 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                    Close
                </button>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Clock className="w-5 h-5 text-yellow-500" />;
            case 'ASSIGNED':
                return <Package className="w-5 h-5 text-blue-500" />;
            case 'READY':
                return <Check className="w-5 h-5 text-green-500" />;
            case 'DELIVERED':
                return <Check className="w-5 h-5 text-green-600" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'Pending';
            case 'ASSIGNED':
                return 'In Progress';
            case 'READY':
                return 'Ready';
            case 'DELIVERED':
                return 'Delivered';
            default:
                return 'Unknown';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'ASSIGNED':
                return 'bg-blue-100 text-blue-800';
            case 'READY':
                return 'bg-green-100 text-green-800';
            case 'DELIVERED':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const sortedOrders = [...customer.orders].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
        <div className="space-y-4">
            {sortedOrders.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-600">No orders found.</p>
                </div>
            ) : (
                sortedOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center space-x-2 mb-1">
                                    <h3 className="font-semibold text-gray-800">Order #{order.id.slice(-8)}</h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                        {getStatusText(order.status)}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <div className="flex items-center space-x-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{order.locationName}</span>
                                    </div>
                                    <span>€{order.total.toFixed(2)}</span>
                                    <span>{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            {getStatusIcon(order.status)}
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-700 text-sm">Items:</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {order.items.map((item, index) => (
                                    <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                                        <img 
                                            src={item.imageUrl} 
                                            alt={item.name} 
                                            className="w-10 h-10 object-cover rounded-md"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                                            <p className="text-xs text-gray-600">€{item.price.toFixed(2)} x {item.quantity}</p>
                                        </div>
                                        <span className="text-sm font-medium text-gray-800">
                                            €{(item.price * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {order.status !== 'DELIVERED' && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center space-x-2 text-sm">
                                    {getStatusIcon(order.status)}
                                    <span className="text-gray-600">
                                        {order.status === 'PENDING' && 'Your order is being processed'}
                                        {order.status === 'ASSIGNED' && 'Your order is being prepared'}
                                        {order.status === 'READY' && 'Your order is ready for pickup'}
                                    </span>
                                </div>
                                {order.waiterAssignedAt && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Assigned to waiter at {new Date(order.waiterAssignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                                {order.readyAt && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Ready at {new Date(order.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                        )}

                        {order.deliveredAt && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center space-x-2 text-sm">
                                    <Check className="w-4 h-4 text-green-600" />
                                    <span className="text-green-600">
                                        Delivered at {new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}