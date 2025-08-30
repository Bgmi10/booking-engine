import { useState, useEffect } from 'react';
import type { WaiterOrder } from '../../../types/types';
import type { Customer } from '../../../hooks/useCustomers';
import PaymentMethodSelection from '../customers/PaymentMethodSelection';
import ManualTransactionForm from '../customers/ManualTransactionForm';
import HostedInvoiceForm from '../customers/HostedInvoiceForm';
import { baseUrl } from '../../../utils/constants';
import { X, ArrowLeft } from 'lucide-react';
import Loader from '../../Loader';

interface CollectPaymentModalProps {
    order: WaiterOrder;
    onClose: () => void;
    onPaymentSuccess: () => void;
}

export default function CollectPaymentModal({ order, onClose, onPaymentSuccess }: CollectPaymentModalProps) {
    const [view, setView] = useState<'payment_method' | 'manual_transaction' | 'hosted_invoice'>('payment_method');
    const [isProcessing, setIsProcessing] = useState(false);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);

    useEffect(() => {
        const fetchCustomer = async () => {
            const customerId = order.customerId;
            if (!customerId) return;

            // Only fetch if switching to a view that needs the full customer object
            if (view === 'manual_transaction' || view === 'hosted_invoice') {
                setIsLoadingCustomer(true);
                try {
                    const response = await fetch(`${baseUrl}/admin/customers/${customerId}`, {
                        credentials: 'include'
                    });
                    if (!response.ok) throw new Error('Failed to fetch customer details.');
                    const data = await response.json();
                    setCustomer(data.data);
                } catch (error) {
                    console.error(error);
                    alert('Could not load customer data. Please try again.');
                    setView('payment_method'); // Revert view on error
                } finally {
                    setIsLoadingCustomer(false);
                }
            }
        };

        fetchCustomer();
    }, [view, order.customerId]);

    const handlePaymentMethodSelected = async (methodId: string) => {
        if (methodId === 'cash') {
            setIsProcessing(true);
            try {
                const response = await fetch(`${baseUrl}/admin/charges/cash`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        customerId: order.customerId || order.temporaryCustomerId,
                        amount: order.total,
                        description: `Payment for Order #${order.id.slice(-6)}`,
                        orderId: order.id,
                        isTemporaryCustomer: !!order.temporaryCustomerId
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to process cash payment.');
                }
                
                onPaymentSuccess();
                
            } catch (error) {
                console.error('Error processing cash payment:', error);
                alert((error as Error).message || 'An unexpected error occurred while processing cash payment.');
            } finally {
                setIsProcessing(false);
            }
            return;
        }
        
        if (methodId === 'manual_transaction_id') {
            setView('manual_transaction');
        } else if (methodId === 'hosted_invoice') {
            setView('hosted_invoice');
        } else if (methodId === 'qr_code') {
            setIsProcessing(true);
            try {
                const response = await fetch(`${baseUrl}/admin/charges/create-qr-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        customerId: order.customerId || order.temporaryCustomerId,
                        amount: order.total,
                        description: `Payment for Order #${order.id.slice(-6)}`,
                        currency: 'eur', // Assuming EUR, adjust if needed
                        type: "product_charge",
                        orderId: order.id,
                        isTemporaryCustomer: !!order.temporaryCustomerId,
                    }),
                });
    
                const responseData = await response.json();
    
                if (!response.ok) {
                    alert(responseData.message || 'Failed to create QR session.');
                    return;
                }
                
                // On success for QR, we can consider the payment "handled" from the waiter's perspective
                onPaymentSuccess();
                window.open(`/qr/${responseData.data.chargeId}`, '_blank');
    
            } catch (error) {
                console.error('Error creating QR session:', error);
                alert('An unexpected error occurred while creating the QR session.');
            } finally {
                setIsProcessing(false);
            }
        }
    };
    
    const handleBack = () => {
        if (view === 'manual_transaction' || view === 'hosted_invoice') {
            setView('payment_method');
        } else {
            onClose();
        }
    };

    const renderContent = () => {
        if (isLoadingCustomer) {
            return <div className="flex justify-center items-center h-full"><Loader /></div>;
        }

        switch (view) {
            case 'manual_transaction':
                if (!customer) return <p className="p-4 text-center">Could not load customer data.</p>;
                return (
                    <ManualTransactionForm
                        customer={customer}
                        amount={String(order.total)}
                        description={`Payment for Order #${order.id.slice(-6)}`}
                        onBack={handleBack}
                        onClose={onPaymentSuccess}
                        isProcessing={isProcessing}
                        orderId={order.id}
                    />
                );
            case 'hosted_invoice':
                if (!customer) return <p className="p-4 text-center">Could not load customer data.</p>;
                return (
                    <HostedInvoiceForm
                        customer={customer}
                        amount={String(order.total)}
                        currency={{ code: 'eur', symbol: '€' }}
                        description={`Payment for Order #${order.id.slice(-6)}`}
                        onBack={handleBack}
                        onClose={onPaymentSuccess}
                        isProcessing={isProcessing}
                        chargeType="product_charge"
                        orderId={order.id}
                    />
                );
            case 'payment_method':
            default:
                return (
                     <PaymentMethodSelection
                        amount={String(order.total)}
                        currency={{ code: 'eur', symbol: '€' }}
                        onNext={handlePaymentMethodSelected}
                        isProcessing={isProcessing}
                        description={`Payment for Order #${order.id.slice(-6)}`}
                    />
                );
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full m-auto flex flex-col h-[95vh] max-h-[720px] relative overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <button onClick={handleBack} className="text-gray-500 hover:text-gray-800 p-2 cursor-pointer">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-800">
                        Collect Payment for Order
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 cursor-pointer">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
} 