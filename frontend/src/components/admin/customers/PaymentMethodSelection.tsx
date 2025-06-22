import { useState } from 'react';

interface PaymentMethodSelectionProps {
    amount: string;
    currency: {
        code: string;
        symbol: string;
    };
    onBack: () => void;
    onNext: (selectedMethodId: string) => void;
    isProcessing: boolean;
}

const paymentMethods = [
    {
        id: 'qr_code',
        title: 'QR Code',
        description: 'Customer scans a QR code to pay.',
    },
    {
        id: 'hosted_invoice',
        title: 'Hosted Invoice',
        description: 'Email your customer a payment link to pay later.',
    },
    {
        id: 'manual_charge',
        title: 'Manually Charge Card',
        description: 'Enter card information or select a saved card.',
    },
    {
        id: 'manual_transaction_id',
        title: 'Manual Transaction ID',
        description: 'Enter transaction ID from stripe',
    }
];

export default function PaymentMethodSelection({ amount, currency, onBack, onNext, isProcessing }: PaymentMethodSelectionProps) {
    const [selectedMethod, setSelectedMethod] = useState(paymentMethods[0].id);

    return (
        <div className="flex flex-col h-full p-6 bg-white overflow-y-auto">
            <div className='flex-grow'>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">How would you like to charge your customer?</h2>

                <div className="space-y-3 overflow-y-auto">
                    {paymentMethods.map(method => (
                        <button
                            key={method.id}
                            onClick={() => setSelectedMethod(method.id)}
                            className={`w-full p-4 text-left border-2 rounded-lg transition-all cursor-pointer ${
                                selectedMethod === method.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                        >
                            <p className="font-semibold text-gray-900">{method.title}</p>
                            <p className="text-sm text-gray-600">{method.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-auto flex-shrink-0">
                <p className="text-center text-sm text-gray-600 mb-4">
                    {currency.symbol}{amount} will be charged to the payment method.
                </p>
                <button
                    onClick={() => onNext(selectedMethod)}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-lg cursor-pointer disabled:opacity-70"
                >
                    {isProcessing ? 'Processing...' : 'Next'}
                </button>
            </div>
        </div>
    );
} 