import { X, CreditCard, Calendar, Clock, RefreshCw, User, FileText } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { Customer as CustomerType } from "../../../hooks/useCustomers";
import { baseUrl } from "../../../utils/constants";
import CreatorInfoModal from "./CreatorInfoModal";
import OrderDetailsModal from "./OrderDetailsModal";

interface TempCustomer {
    id: string;
    surname: string;
    guestEmail?: string;
}

interface PaymentHistoryModalProps {
    customer: CustomerType | TempCustomer;
    customerType: 'regular' | 'temporary';
    onClose: () => void;
}

interface PaymentRecord {
    id: string;
    amount: number;
    currency: string | null;
    description: string | null;
    status: string;
    expiredAt: string | null;
    createdAt: string;
    paymentMethod: string | null;
    paymentUrl: string | null;
    createdBy: string;
    adminNotes?: string;
    orderId?: string;
}

export default function PaymentHistoryModal({ customer, customerType, onClose }: PaymentHistoryModalProps) {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refundingId, setRefundingId] = useState<string | null>(null);
    const [creatorIdForModal, setCreatorIdForModal] = useState<string | null>(null);
    const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);

    const renderCustomerInfo = () => {
        if (customerType === 'regular') {
            const regularCustomer = customer as CustomerType;
            return `${regularCustomer.guestFirstName} ${regularCustomer.guestLastName} • ${regularCustomer.guestEmail}`;
        } else {
            const tempCustomer = customer as TempCustomer;
            return `${tempCustomer.surname} ${tempCustomer.guestEmail ? `• ${tempCustomer.guestEmail}` : ''}`;
        }
    }

    const fetchPaymentHistory = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = customerType === 'regular'
                ? `${baseUrl}/admin/customers/${customer.id}/charge-payments`
                : `${baseUrl}/admin/temp-customers/${customer.id}/charge-payments`;
            
            const response = await fetch(endpoint, {
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                setPayments(data.data.charges || []);
            } else {
                console.error("Failed to fetch payment history");
                setPayments([]);
            }
        } catch (error) {
            console.error("Error fetching payment history:", error);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    }, [customer.id, customerType]);

    useEffect(() => {
        fetchPaymentHistory();
    }, [fetchPaymentHistory]);

    const handleRefund = async (payment: PaymentRecord) => {
        if (!window.confirm("Are you sure you want to refund this payment? This action cannot be undone.")) {
            return;
        }
        setRefundingId(payment.id);
        try {
            let refundUrl = `${baseUrl}/admin/charges/${payment.id}/refund`;
            if (payment.paymentMethod?.toLowerCase() === 'cash') {
                refundUrl += '?paymentMethod=cash';
            }

            const response = await fetch(refundUrl, {
                method: "POST",
                credentials: "include",
            });
            if (response.ok) {
                alert("Payment refunded successfully.");
                fetchPaymentHistory();
            } else {
                const errorData = await response.json().catch(() => ({ message: "Failed to refund payment." }));
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            console.error("Error refunding payment:", error);
            alert("An error occurred while refunding the payment.");
        } finally {
            setRefundingId(null);
        }
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleString();
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "SUCCEEDED":
            case "PAID":
                return "bg-green-100 text-green-800";
            case "PENDING":
                return "bg-yellow-100 text-yellow-800";
            case "FAILED":
                return "bg-red-100 text-red-800";
            case "CANCELLED":
            case "EXPIRED":
                return "bg-gray-100 text-gray-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Charge History
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {renderCustomerInfo()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6 cursor-pointer" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading charge history...</span>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-12">
                            <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No charge history found</h3>
                            <p className="text-gray-600">This customer hasn't had any charges created for them yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {payments && payments?.map((payment) => (
                                <div key={payment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">
                                                    {payment.description || `Charge #${payment.id.slice(-8)}`}
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    Method: {payment.paymentMethod ? payment.paymentMethod.replace("_", " ") : 'Room Charge'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                            {payment.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600">Amount:</span>
                                            <span className="font-medium text-gray-900">
                                                {payment.currency && `${payment.currency.toUpperCase()} `}{payment.amount}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-600">Created:</span>
                                            <span className="font-medium text-gray-900">
                                                {formatDate(payment.createdAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-gray-500" />
                                                <span className="text-gray-600">Expires:</span>
                                                <span className="font-medium text-gray-900">
                                                    {formatDate(payment.expiredAt)}
                                                </span>
                                        </div>
                                    </div>

                                    {payment.status === 'REFUNDED' && payment.adminNotes && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <div className="flex items-start gap-2">
                                                <span className="text-gray-600 text-sm">Refund Reason:</span>
                                                <span className="text-sm text-gray-900 bg-red-50 px-2 py-1 rounded border border-red-200">
                                                    {payment.adminNotes}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4">
                                        {(payment.status === 'SUCCEEDED' || payment.status === 'PAID') && (
                                            <button 
                                                onClick={() => handleRefund(payment)}
                                                disabled={refundingId === payment.id}
                                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
                                            >
                                                {refundingId === payment.id ? (
                                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                ) : null}
                                                Refund
                                            </button>
                                        )}
                                        {payment.createdBy && (
                                            <button 
                                                onClick={() => setCreatorIdForModal(payment.createdBy)}
                                                className="cursor-pointer inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                            >
                                                <User className="h-4 w-4 mr-2" />
                                                Created By
                                            </button>
                                        )}
                                        {payment.orderId && (
                                            <button 
                                                onClick={() => setViewingOrderId(payment.orderId!)}
                                                className="cursor-pointer inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-md hover:bg-blue-200"
                                            >
                                                <FileText className="h-4 w-4 mr-2" />
                                                View Order
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {creatorIdForModal && (
                <CreatorInfoModal 
                    userId={creatorIdForModal} 
                    onClose={() => setCreatorIdForModal(null)} 
                />
            )}
            {viewingOrderId && (
                <OrderDetailsModal 
                    orderId={viewingOrderId}
                    onClose={() => setViewingOrderId(null)}
                />
            )}
        </div>
    );
} 