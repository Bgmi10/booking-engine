import { CreditCard, Link, X } from "lucide-react";
import { useState } from "react";
import type { Customer as CustomerType } from "../../../hooks/useCustomers";
import CreatePaymentForm from "./CreatePaymentForm";

interface ChargeModalProps {
    customer: CustomerType;
    onClose: () => void;
    step?: string;
    paymentIntentId?: string;
}

export default function ChargeModal({ customer, onClose, step = "Charge a card or send an invoice", paymentIntentId }: ChargeModalProps) {
    const [view, setView] = useState(step); // 'options' or 'create_payment'

    const handleOptionClick = (optionTitle: string) => {
        if (optionTitle === 'Charge a card or send an invoice') {
            setView('create_payment');
        }
    };

    const paymentOptions = [
        {
            title: 'Charge a card or send an invoice',
            description: 'Create a one-time payment.',
            icon: CreditCard,
            iconBgColor: 'bg-blue-100',
            iconTextColor: 'text-blue-600',
            disabled: false,
        },
        {
            title: 'Create a payment link',
            description: 'Share a link to a checkout page.',
            icon: Link,
            iconBgColor: 'bg-gray-200',
            iconTextColor: 'text-gray-500',
            disabled: true,
        },
    ];

    if (view === 'create_payment') {
        return (
            <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 transition-opacity">
                <CreatePaymentForm
                    customer={customer}
                    paymentIntentId={paymentIntentId}
                    onBack={() => setView('options')}
                    onClose={onClose}
                />
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full m-4">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">
                        New Payment
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6 cursor-pointer" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="mb-6 text-sm text-gray-600">
                        Select a payment method for <span className="font-semibold">{customer.guestFirstName} {customer.guestLastName}</span>.
                    </p>
                    <div className="space-y-3">
                        {paymentOptions.map((option, index) => (
                            <button
                                key={index}
                                disabled={option.disabled}
                                onClick={() => !option.disabled && handleOptionClick(option.title)}
                                className="w-full cursor-pointer flex items-center p-4 text-left bg-gray-50 rounded-lg transition-all duration-200 ease-in-out transform enabled:hover:bg-gray-100 enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <div className={`p-2 ${option.iconBgColor} rounded-lg mr-4`}>
                                    <option.icon className={`h-6 w-6 ${option.iconTextColor}`} />
                                </div>
                                <div className="flex-grow">
                                    <p className={`font-semibold ${option.disabled ? 'text-gray-500' : 'text-gray-900'}`}>{option.title}</p>
                                    <p className={`text-sm ${option.disabled ? 'text-gray-400' : 'text-gray-500'}`}>{option.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 