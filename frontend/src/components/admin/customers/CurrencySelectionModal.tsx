import { X, Check } from "lucide-react";

export const currencies = [
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'United States Dollar', symbol: '$' },
    { code: 'GBP', name: 'British Pound Sterling', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'India', symbol: '₹' },
];

interface CurrencySelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCurrency: (currency: typeof currencies[0]) => void;
    selectedCurrency: string;
}

export default function CurrencySelectionModal({ isOpen, onClose, onSelectCurrency, selectedCurrency }: CurrencySelectionModalProps) {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-white z-10 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-800">
                    Select Currency
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 cursor-pointer">
                    <X size={20} />
                </button>
            </div>
            <div className="overflow-y-auto">
                <ul>
                    {currencies.map((currency) => (
                        <li key={currency.code}>
                            <button
                                onClick={() => onSelectCurrency(currency)}
                                className="w-full flex items-center cursor-pointer justify-between p-4 text-left hover:bg-gray-50"
                            >
                                <div>
                                    <span className="font-bold text-gray-800">{currency.code}</span>
                                    <span className="text-gray-500 ml-2">{currency.name}</span>
                                </div>
                                {selectedCurrency === currency.code && (
                                    <Check size={20} className="text-blue-600" />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
} 