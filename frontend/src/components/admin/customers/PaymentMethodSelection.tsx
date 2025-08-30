import { useState } from 'react';
import { paymentMethods } from '../../../utils/constants';
import { useGeneralSettings } from '../../../hooks/useGeneralSettings';

interface PaymentMethodSelectionProps {
    amount: string;
    currency: {
        code: string;
        symbol: string;
    };
    onNext: (selectedMethodId: string, data?: any) => void;
    isProcessing: boolean;
    description?: string;
    hideAmountDisplay?: boolean;
}

interface PaymentConfig {
    qr_code: boolean;
    hosted_invoice: boolean;
    manual_charge: boolean;
    manual_transaction_id: boolean;
    cash: boolean;
}


export default function PaymentMethodSelection({ amount, currency, onNext, isProcessing, hideAmountDisplay }: PaymentMethodSelectionProps) {
    const [selectedMethod, setSelectedMethod] = useState<string>('');
    const { settings, loader } = useGeneralSettings();
    const config = JSON.parse(settings?.chargePaymentConfig || '{}')

    const handleNextClick = async () => {
        onNext(selectedMethod);
    }

    if (loader) {
        return (
            <div className="flex flex-col h-full p-6 bg-white overflow-y-auto">
                <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">Loading payment methods...</div>
                </div>
            </div>
        );
    }

    const hasActiveMethods = paymentMethods.some(method => config[method.id as keyof PaymentConfig] !== false);

    return (
        <div className="flex flex-col h-full p-6 bg-white overflow-y-auto">
            <div className='flex-grow'>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">How would you like to charge your customer?</h2>

                <div className="space-y-3 overflow-y-auto">
                    {paymentMethods.map(method => {
                        const isActive = config[method.id as keyof PaymentConfig] !== false;
                        const isSelected = selectedMethod === method.id;
                        
                        return (
                            <button
                                key={method.id}
                                onClick={() => isActive && setSelectedMethod(method.id)}
                                disabled={!isActive}
                                className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
                                    isActive 
                                        ? isSelected 
                                            ? 'border-blue-600 bg-blue-50/50' 
                                            : 'border-gray-300 hover:border-gray-400'
                                        : 'border-gray-200 bg-gray-50 opacity-60'
                                } ${isActive ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className={`font-semibold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {method.title}
                                        </p>
                                        <p className={`text-sm ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                                            {method.description}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        isActive 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {isActive ? 'Available' : 'Not Available'}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {!hasActiveMethods && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-yellow-800 font-medium">No payment methods available</div>
                        <div className="text-yellow-700 text-sm">Please enable at least one payment method in settings</div>
                    </div>
                )}
            </div>

            <div className="mt-auto flex-shrink-0">
                {!hideAmountDisplay && (
                    <p className="text-center text-sm text-gray-600 mb-4">
                        {currency.symbol}{amount} will be charged to the payment method.
                    </p>
                )}
                <button
                    onClick={handleNextClick}
                    disabled={isProcessing || !selectedMethod || !hasActiveMethods}
                    className="w-full mt-3 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-lg cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processing...' : 'Next'}
                </button>
            </div>
        </div>
    );
} 