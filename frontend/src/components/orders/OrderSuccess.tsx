import { useState } from "react";
import { Check, Clock, Package, RotateCcw } from "lucide-react";
import { useCustomer } from "../../context/CustomerContext";
import OrderHistory from "./OrderHistory";

interface OrderSuccessProps {
    onOrderAgain: () => void;
    onClose: () => void;
}

export default function OrderSuccess({ onOrderAgain, onClose }: OrderSuccessProps) {
    const { customer } = useCustomer();
    const [showHistory, setShowHistory] = useState(false);

    if (!customer || !customer?.orders || customer.orders.length === 0) {
        return null;
    }

    const latestOrder = customer.orders[0];
    const orderStatus = latestOrder.status;
    
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Clock className="w-6 h-6 text-yellow-500" />;
            case 'ASSIGNED':
                return <Package className="w-6 h-6 text-blue-500" />;
            case 'READY':
                return <Check className="w-6 h-6 text-green-500" />;
            case 'DELIVERED':
                return <Check className="w-6 h-6 text-green-600" />;
            default:
                return <Clock className="w-6 h-6 text-gray-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'Order Received';
            case 'ASSIGNED':
                return 'Being Prepared';
            case 'READY':
                return 'Ready for Pickup';
            case 'DELIVERED':
                return 'Delivered';
            default:
                return 'Processing';
        }
    };

    const getStatusDescription = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'Your order has been received and is being processed';
            case 'ASSIGNED':
                return 'Your order is being prepared by our staff';
            case 'READY':
                return 'Your order is ready for pickup';
            case 'DELIVERED':
                return 'Your order has been successfully delivered';
            default:
                return 'Your order is being processed';
        }
    };

    if (showHistory) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Order History</h2>
                            <button 
                                onClick={() => setShowHistory(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <OrderHistory onClose={() => setShowHistory(false)} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Placed Successfully!</h2>
                        <p className="text-gray-600">Thank you for your order</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-800">Order Status</h3>
                            {getStatusIcon(orderStatus)}
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="flex-1">
                                <p className="font-medium text-gray-800">{getStatusText(orderStatus)}</p>
                                <p className="text-sm text-gray-600">{getStatusDescription(orderStatus)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-800 mb-3">Order Details</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Order ID:</span>
                                <span className="font-medium text-gray-800">{latestOrder.id.slice(-8)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Location:</span>
                                <span className="font-medium text-gray-800">{latestOrder.locationName}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total Amount:</span>
                                <span className="font-medium text-gray-800">€{latestOrder.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Ordered At:</span>
                                <span className="font-medium text-gray-800">
                                    {new Date(latestOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-800 mb-3">Items Ordered</h3>
                        <div className="space-y-2">
                            {latestOrder.items.map((item: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <img 
                                            src={item.imageUrl} 
                                            alt={item.name} 
                                            className="w-12 h-12 object-cover rounded-md"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-800">{item.name}</p>
                                            <p className="text-sm text-gray-600">€{item.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <span className="font-medium text-gray-800">x{item.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex space-x-3 mb-4">
                        <button
                            onClick={() => setShowHistory(true)}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                        >
                            <Clock className="w-4 h-4" />
                            <span>Track Order</span>
                        </button>
                        <button
                            onClick={onOrderAgain}
                            className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Order Again</span>
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}