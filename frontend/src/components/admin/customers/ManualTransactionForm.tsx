import { useState } from 'react';
import { ArrowLeft, CreditCard, AlertCircle } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import type { Customer } from '../../../hooks/useCustomers';

interface ManualTransactionFormProps {
    customer: Customer;
    onBack: () => void;
    onClose: () => void;
    isProcessing: boolean;
}

export default function ManualTransactionForm({ customer, onBack, onClose, isProcessing }: ManualTransactionFormProps) {
    const [transactionId, setTransactionId] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!transactionId.trim()) {
            setError('Transaction ID is required');
            return;
        }

        try {
            const response = await fetch(`${baseUrl}/admin/charges/manual-transaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    customerId: customer.id,
                    transactionId: transactionId.trim(),
                    description: description.trim() || undefined
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setError(data.message || 'Failed to record transaction');
            }
        } catch (error) {
            console.error('Error recording manual transaction:', error);
            setError('An error occurred while recording the transaction');
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <CreditCard className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Transaction Recorded Successfully!</h3>
                        <p className="text-sm text-gray-600">
                            The manual transaction has been recorded and can now be refunded if needed.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800">Manual Transaction ID</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Record a payment made outside the system
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-medium text-blue-900 mb-1">How this works</h4>
                                    <p className="text-sm text-blue-800">
                                        Enter a Stripe transaction ID (starts with "pi_" for Payment Intent or "ch_" for Charge) to record a payment that was made outside this system. 
                                        This allows you to track and refund the payment later.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="transactionId" className="block text-sm font-medium text-gray-700 mb-2">
                                Stripe Transaction ID *
                            </label>
                            <input
                                type="text"
                                id="transactionId"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder="pi_1234567890abcdef or ch_1234567890abcdef"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isProcessing}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                The transaction ID from Stripe (Payment Intent: "pi_" or Charge: "ch_")
                            </p>
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description (Optional)
                            </label>
                            <input
                                type="text"
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g., PayPal payment for extra services"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isProcessing}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onBack}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing || !transactionId.trim()}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                            >
                                {isProcessing ? 'Recording...' : 'Record Transaction'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 