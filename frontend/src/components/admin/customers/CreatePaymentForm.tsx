import { useState } from 'react';
import type { Customer as CustomerType } from "../../../hooks/useCustomers";
import { ArrowLeft, X } from 'lucide-react';
import CurrencySelectionModal, { currencies } from './CurrencySelectionModal';
import PaymentMethodSelection from './PaymentMethodSelection';
import ManualTransactionForm from './ManualTransactionForm';
import HostedInvoiceForm from './HostedInvoiceForm';
import { baseUrl } from '../../../utils/constants';

interface CreatePaymentFormProps {
    customer: CustomerType;
    onBack: () => void;
    onClose: () => void;
}

const NumpadButton = ({ value, letters, onClick }: { value: string; letters?: string; onClick: (value: string) => void }) => (
    <button
        onClick={() => onClick(value)}
        className="bg-gray-200/60 hover:bg-gray-300/60 text-gray-800 font-bold py-4 rounded-lg text-2xl transition-colors aspect-video"
    >
        {value}
        {letters && <div className="text-xs font-normal tracking-widest">{letters}</div>}
    </button>
);

const BackspaceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
        <line x1="18" y1="9" x2="12" y2="15" />
        <line x1="12" y1="9" x2="18" y2="15" />
    </svg>
);


const BackspaceButton = ({ onClick }: { onClick: () => void }) => (
    <button
        onClick={onClick}
        className="bg-gray-200/60 hover:bg-gray-300/60 text-gray-800 font-bold py-4 rounded-lg flex justify-center items-center aspect-video"
    >
        <BackspaceIcon />
    </button>
);

export default function CreatePaymentForm({ customer, onBack, onClose }: CreatePaymentFormProps) {
    const [view, setView] = useState('amount_entry'); // amount_entry, payment_method, manual_transaction, hosted_invoice, qr_code, card_entry
    const [amount, setAmount] = useState('0');
    const [description, setDescription] = useState('');
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
    const [currency, setCurrency] = useState(currencies[0]);
    const [isProcessing, setIsProcessing] = useState(false);
    //@ts-ignore
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

    const handleNumpadClick = (value: string) => {
        let newAmount = amount;
        if (value === '.') {
            if (newAmount.includes('.')) return;
            newAmount = newAmount + '.';
        } else if (newAmount === '0') {
            newAmount = value;
        } else {
            const parts = newAmount.split('.');
            if (parts.length > 1 && parts[1].length >= 2) {
                return;
            }
            newAmount = newAmount + value;
        }
        setAmount(newAmount);
    };

    const handleSelectCurrency = (currency: typeof currencies[0]) => {
        setCurrency(currency);
        setIsCurrencyModalOpen(false);
    };

    const handleNextFromAmount = () => {
        setView('payment_method');
    };

    const handlePaymentMethodSelect = (methodId: string) => {
        setSelectedPaymentMethod(methodId);
        
        if (methodId === 'manual_transaction_id') {
            setView('manual_transaction');
        } else if (methodId === 'hosted_invoice') {
            setView('hosted_invoice');
        } else if (methodId === 'qr_code') {
            setView('qr_code');
        } else if (methodId === 'manual_charge') {
            setView('card_entry');
        }
    };

    const handlePaymentMethodNext = async (selectedMethodId: string) => {
        if (selectedMethodId === 'manual_transaction_id') {
            setView('manual_transaction');
            return;
        }

        if (selectedMethodId === 'hosted_invoice') {
            setView('hosted_invoice');
            return;
        }

        if (selectedMethodId !== 'qr_code') {
            alert('This payment method is not implemented yet.');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch(baseUrl + `/admin/charges/create-qr-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    customerId: customer.id,
                    amount: amount,
                    description: description,
                    currency: currency.code,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Failed to create QR session.');
                return;
            }
            
            window.location.href = `/qr/${data.data.chargeId}`;

        } catch (error) {
            console.error('Error creating QR session:', error);
            alert('An unexpected error occurred while creating the QR session.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBackspace = () => {
        if (amount.length > 1) {
            setAmount(amount.slice(0, -1));
        } else {
            setAmount('0');
        }
    };

    const handleBack = () => {
        if (view === 'payment_method') {
            setView('amount_entry');
        } else if (view === 'manual_transaction') {
            setView('payment_method');
        } else if (view === 'hosted_invoice') {
            setView('payment_method');
        } else if (view === 'qr_code') {
            setView('payment_method');
        } else if (view === 'card_entry') {
            setView('payment_method');
        } else {
            onBack();
        }
    };

    const displayAmount = amount === '0' ? '0' : amount;

    const renderView = () => {
        switch (view) {
            case 'manual_transaction':
                return (
                    <ManualTransactionForm
                        customer={customer}
                        onBack={handleBack}
                        onClose={onClose}
                        isProcessing={isProcessing}
                    />
                );
            case 'hosted_invoice':
                return (
                    <HostedInvoiceForm
                        customer={customer}
                        amount={amount}
                        currency={currency}
                        onBack={handleBack}
                        description={description}
                        onClose={onClose}
                        isProcessing={isProcessing}
                    />
                );
            case 'payment_method':
                return (
                    <PaymentMethodSelection
                        amount={displayAmount}
                        currency={currency}
                        onNext={handlePaymentMethodNext}
                        isProcessing={isProcessing}
                    />
                );
            case 'qr_code':
                return (
                    <PaymentMethodSelection
                        amount={displayAmount}
                        currency={currency}
                        onNext={handlePaymentMethodSelect}
                        isProcessing={isProcessing}
                    />
                );
            case 'card_entry':
                return (
                    <PaymentMethodSelection
                        amount={displayAmount}
                        currency={currency}
                        onNext={handlePaymentMethodSelect}
                        isProcessing={isProcessing}
                    />
                );
            case 'amount_entry':
            default:
                return (
                    <>
                        <div className="flex-grow p-6 flex flex-col justify-between overflow-y-auto">
                            <div className="flex-shrink-0">
                                {/* <div className="text-center mb-4">
                                    <span className="text-gray-500 text-sm">Currency: </span>
                                    <button onClick={() => setIsCurrencyModalOpen(true)} className="text-blue-600 font-semibold text-sm cursor-pointer">
                                        {currency.code} &gt;
                                    </button>
                                </div> */}
                                <div className="text-center mb-6">
                                    <span className="text-6xl font-light text-gray-800 flex items-center justify-center">
                                         <span className="text-4xl mr-1">{currency.symbol}</span>
                                        <span className="font-medium tracking-tight">{displayAmount}</span>
                                        <span className="inline-block w-1 h-10 bg-blue-500 ml-1 animate-pulse rounded-full"></span>
                                    </span>
                                </div>

                                <div className="mb-6">
                                    <label className="text-sm text-gray-600 flex justify-between">Description <span className="text-gray-400">Optional</span></label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add description"
                                        className="w-full mt-1 p-2 bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-gray-600">Customer</label>
                                    <div className="mt-1 font-semibold text-gray-800 text-lg">
                                        {customer.guestFirstName} {customer.guestLastName}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full mt-6">
                                <button
                                    onClick={handleNextFromAmount}
                                    className="cursor-pointer w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-lg"
                                    disabled={parseFloat(amount) <= 0}>
                                    Next
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-gray-300/40 flex-shrink-0">
                            <NumpadButton value="1" letters=" " onClick={handleNumpadClick} />
                            <NumpadButton value="2" letters="ABC" onClick={handleNumpadClick} />
                            <NumpadButton value="3" letters="DEF" onClick={handleNumpadClick} />
                            <NumpadButton value="4" letters="GHI" onClick={handleNumpadClick} />
                            <NumpadButton value="5" letters="JKL" onClick={handleNumpadClick} />
                            <NumpadButton value="6" letters="MNO" onClick={handleNumpadClick} />
                            <NumpadButton value="7" letters="PQRS" onClick={handleNumpadClick} />
                            <NumpadButton value="8" letters="TUV" onClick={handleNumpadClick} />
                            <NumpadButton value="9" letters="WXYZ" onClick={handleNumpadClick} />
                            <NumpadButton value="." onClick={handleNumpadClick} />
                            <NumpadButton value="0" onClick={handleNumpadClick} />
                            <BackspaceButton onClick={handleBackspace} />
                        </div>
                    </>
                );
        }
    };
    
    return (
        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full m-auto flex flex-col h-[95vh] max-h-[720px] relative overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                <button onClick={handleBack} className="text-gray-500 hover:text-gray-800 p-2 cursor-pointer">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                    Create a payment
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 cursor-pointer">
                    <X size={20} />
                </button>
            </div>
            
            {renderView()}

            <CurrencySelectionModal
                isOpen={isCurrencyModalOpen}
                onClose={() => setIsCurrencyModalOpen(false)}
                onSelectCurrency={handleSelectCurrency}
                selectedCurrency={currency.code}
            />
        </div>
    );
} 